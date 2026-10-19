// Every read and write the staff panel makes (E9 to E14 in docs/SDD.md). The database's
// RLS policies decide what is allowed; this module turns refusals into AdminError kinds.
// A write that changes no rows was either refused by RLS or hit a row that is gone, and
// is_admin() tells which.
import type { PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';
import { photoWidths, type PhotoFormat } from '../catalog/photos';
import type { AdminClient } from './adminClient';
import { AdminError, failureKind } from './errors';
import type { ProcessedPhoto } from './photos/processPhoto';

type Tables = Database['public']['Tables'];
export type AdminCategory = Tables['categories']['Row'];
export type AdminItem = Tables['items']['Row'];
export type ItemInsert = Tables['items']['Insert'];
export type ItemUpdate = Tables['items']['Update'];
export type CategoryInsert = Tables['categories']['Insert'];
export type CategoryUpdate = Tables['categories']['Update'];
export type ContactMessage = Tables['contact_messages']['Row'];

interface Response<T> {
  data: T | null;
  error: PostgrestError | null;
  status: number;
}

function unwrap<T>({ data, error, status }: Response<T>): NonNullable<T> {
  if (error) throw new AdminError(failureKind(error, status), { cause: error });
  if (data === null || data === undefined) throw new AdminError('unknown');
  return data;
}

/** Explains a write that changed nothing: refused, or the row is gone. */
async function nothingChanged(client: AdminClient): Promise<never> {
  const { data } = await client.rpc('is_admin');
  throw new AdminError(data === true ? 'notFound' : 'permission');
}

export async function staffRow(client: AdminClient, userId: string) {
  const response = await client
    .from('admins')
    .select('require_mfa')
    .eq('user_id', userId)
    .maybeSingle();
  if (response.error) throw new AdminError(failureKind(response.error, response.status));
  return response.data;
}

export async function loadCatalog(client: AdminClient) {
  const [categories, items] = await Promise.all([
    client.from('categories').select('*').order('sort_order').order('name_en'),
    client.from('items').select('*').order('sort_order').order('name_en'),
  ]);
  return { categories: unwrap(categories), items: unwrap(items) };
}

/** Contact form messages, newest first (FR-32). RLS lets only staff read them. */
export async function loadMessages(client: AdminClient): Promise<ContactMessage[]> {
  return unwrap(
    await client
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  );
}

export async function loadItem(client: AdminClient, id: string): Promise<AdminItem | null> {
  const response = await client.from('items').select('*').eq('id', id).maybeSingle();
  if (response.error) throw new AdminError(failureKind(response.error, response.status));
  return response.data;
}

export async function createItem(client: AdminClient, fields: ItemInsert): Promise<AdminItem> {
  return unwrap(await client.from('items').insert(fields).select().single());
}

export async function updateItem(
  client: AdminClient,
  id: string,
  fields: ItemUpdate,
): Promise<AdminItem> {
  const rows = unwrap(await client.from('items').update(fields).eq('id', id).select());
  const [row] = rows;
  return row ?? nothingChanged(client);
}

/** FR-40. Returns how many items changed. */
export async function markAllOutOfStock(client: AdminClient): Promise<number> {
  const rows = unwrap(
    await client
      .from('items')
      .update({ is_available: false })
      .eq('is_available', true)
      .select('id'),
  );
  if (rows.length === 0) {
    const { data } = await client.rpc('is_admin');
    if (data !== true) throw new AdminError('permission');
  }
  return rows.length;
}

export async function deleteItem(client: AdminClient, item: AdminItem): Promise<void> {
  const rows = unwrap(await client.from('items').delete().eq('id', item.id).select('id'));
  if (rows.length === 0) await nothingChanged(client);
  if (item.photo_path && item.photo_format) {
    await removePhotoFiles(client, item.photo_path, item.photo_format);
  }
}

export async function reorderItems(client: AdminClient, categoryId: string, ids: string[]) {
  const response = await client.rpc('reorder_items', { p_category_id: categoryId, p_ids: ids });
  if (response.error) throw new AdminError(failureKind(response.error, response.status));
}

export async function createCategory(client: AdminClient, fields: CategoryInsert) {
  return unwrap(await client.from('categories').insert(fields).select().single());
}

export async function updateCategory(client: AdminClient, id: string, fields: CategoryUpdate) {
  const rows = unwrap(await client.from('categories').update(fields).eq('id', id).select());
  const [row] = rows;
  return row ?? nothingChanged(client);
}

/** Refused with "categoryInUse" while the category has items (FR-42). */
export async function deleteCategory(client: AdminClient, id: string): Promise<void> {
  const rows = unwrap(await client.from('categories').delete().eq('id', id).select('id'));
  if (rows.length === 0) await nothingChanged(client);
}

export async function reorderCategories(client: AdminClient, ids: string[]) {
  const response = await client.rpc('reorder_categories', { p_ids: ids });
  if (response.error) throw new AdminError(failureKind(response.error, response.status));
}

const bucket = 'item-photos';

function photoFiles(path: string, format: PhotoFormat): string[] {
  return photoWidths.map((width) => `${path}/${String(width)}.${format}`);
}

/** Uploads the processed sizes into a new version folder (BACKEND-SCHEMA 6). */
export async function uploadPhoto(
  client: AdminClient,
  itemId: string,
  photo: ProcessedPhoto,
): Promise<{ photo_path: string; photo_format: PhotoFormat }> {
  const path = `items/${itemId}/${String(Date.now())}`;
  const contentType = photo.format === 'webp' ? 'image/webp' : 'image/jpeg';
  for (const { width, blob } of photo.files) {
    const { error } = await client.storage
      .from(bucket)
      .upload(`${path}/${String(width)}.${photo.format}`, blob, {
        contentType,
        cacheControl: '31536000',
        upsert: false,
      });
    if (error) {
      await removePhotoFiles(client, path, photo.format);
      throw new AdminError('unknown', { cause: error });
    }
  }
  return { photo_path: path, photo_format: photo.format };
}

/** Best effort: a leftover file is harmless, so a failure here never fails the save. */
export async function removePhotoFiles(client: AdminClient, path: string, format: PhotoFormat) {
  await client.storage.from(bucket).remove(photoFiles(path, format));
}

export type PhotoChange =
  { kind: 'keep' } | { kind: 'remove' } | { kind: 'new'; photo: ProcessedPhoto };

/**
 * Saves an item and its photo. A new item is created first, because the photo folder is
 * named after its id. Old photo files are deleted only after the new state is saved.
 */
export async function saveItem(
  client: AdminClient,
  current: AdminItem | null,
  fields: ItemUpdate & Pick<ItemInsert, 'category_id' | 'name_en' | 'price_centavos'>,
  change: PhotoChange,
): Promise<{ item: AdminItem; photoFailed: boolean }> {
  if (!current) {
    const item = await createItem(client, fields);
    if (change.kind !== 'new') return { item, photoFailed: false };
    try {
      const photo = await uploadPhoto(client, item.id, change.photo);
      return { item: await updateItem(client, item.id, photo), photoFailed: false };
    } catch {
      return { item, photoFailed: true };
    }
  }

  let photoFields: ItemUpdate = {};
  if (change.kind === 'new') photoFields = await uploadPhoto(client, current.id, change.photo);
  if (change.kind === 'remove') photoFields = { photo_path: null, photo_format: null };

  let item: AdminItem;
  try {
    item = await updateItem(client, current.id, { ...fields, ...photoFields });
  } catch (error) {
    if (photoFields.photo_path && photoFields.photo_format) {
      await removePhotoFiles(client, photoFields.photo_path, photoFields.photo_format);
    }
    throw error;
  }

  if (change.kind !== 'keep' && current.photo_path && current.photo_format) {
    await removePhotoFiles(client, current.photo_path, current.photo_format);
  }
  return { item, photoFailed: false };
}
