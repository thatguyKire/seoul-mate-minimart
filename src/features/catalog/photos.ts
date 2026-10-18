// Item photo addresses (E15, BACKEND-SCHEMA 6). Each photo is stored at three widths, as
// WebP, or as JPEG when the staff member's browser could not make WebP (D-019).
import { env } from '../../lib/env';

export const photoWidths = [320, 640, 1024] as const;

export type PhotoFormat = 'webp' | 'jpg';

// The database enforces this shape; checking again keeps a bad value out of the address.
const photoPathPattern = /^items\/[0-9a-f-]{36}\/[0-9]+$/;

export function isPhotoPath(path: string | null): path is string {
  return path !== null && photoPathPattern.test(path);
}

export function photoUrl(path: string, width: number, format: PhotoFormat): string {
  return `${env.supabaseUrl}/storage/v1/object/public/item-photos/${path}/${String(width)}.${format}`;
}

export function photoSrcSet(path: string, format: PhotoFormat): string {
  return photoWidths
    .map((width) => `${photoUrl(path, width, format)} ${String(width)}w`)
    .join(', ');
}
