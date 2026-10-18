-- Photo storage, live updates and scheduled clean-up.
-- Design: docs/BACKEND-SCHEMA.md sections 4.3 and 6.

-- Public read by direct URL only. With no select policy for visitors, the bucket cannot be listed.
-- Photos are processed in the staff member's browser, so only WebP and JPEG arrive (D-019).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Staff may write only files that match items/<item id>/<version>/<width>.<webp or jpg>.
create policy "Staff can read item photo files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'item-photos' and (select public.is_admin()));

create policy "Staff can upload item photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'item-photos'
    and name ~ '^items/[0-9a-f-]{36}/[0-9]+/(320|640|1024)\.(webp|jpg)$'
    and (select public.is_admin())
  );

create policy "Staff can replace item photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'item-photos' and (select public.is_admin()))
  with check (
    bucket_id = 'item-photos'
    and name ~ '^items/[0-9a-f-]{36}/[0-9]+/(320|640|1024)\.(webp|jpg)$'
    and (select public.is_admin())
  );

create policy "Staff can delete item photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'item-photos' and (select public.is_admin()));

-- Visitors subscribe to changes of the one-row menu_state table (D-020).
alter publication supabase_realtime add table public.menu_state;

-- Scheduled jobs. pg_cron runs in UTC: 19:00 UTC is 03:00 in the Philippines.
create extension if not exists pg_cron;

-- Placeholder retention of 180 days until the owner answers PRD Q9 (NFR-PRIV-03).
select cron.schedule(
  'purge-contact-messages',
  '0 19 * * *',
  $$delete from public.contact_messages where created_at < now() - interval '180 days'$$
);

select cron.schedule(
  'purge-rate-limits',
  '17 * * * *',
  $$delete from public.rate_limits where window_start < now() - interval '1 day'$$
);
