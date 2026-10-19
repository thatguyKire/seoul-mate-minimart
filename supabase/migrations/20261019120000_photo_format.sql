-- Records whether an item's photo files are WebP or JPEG (D-019), so visitors' pages ask for
-- the right files instead of trying WebP first. Design: docs/BACKEND-SCHEMA.md section 2.2.

alter table public.items
  add column photo_format text
    constraint items_photo_format_value check (photo_format in ('webp', 'jpg')),
  add constraint items_photo_complete check ((photo_path is null) = (photo_format is null));

-- Visitors need it to build photo addresses (BACKEND-SCHEMA 3).
grant select (photo_format) on public.items to anon;
