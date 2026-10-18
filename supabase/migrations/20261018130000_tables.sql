-- Tables, constraints and indexes. Design: docs/BACKEND-SCHEMA.md sections 2 and 5.
-- Translated text has one column per language (D-021). Times are timestamptz (UTC).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint categories_slug_format
    check (char_length(slug) <= 40 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null
    constraint categories_name_en_length check (btrim(name_en) <> '' and char_length(name_en) <= 60),
  name_fil text
    constraint categories_name_fil_length
    check (name_fil is null or (btrim(name_fil) <> '' and char_length(name_fil) <= 60)),
  name_ko text
    constraint categories_name_ko_length
    check (name_ko is null or (btrim(name_ko) <> '' and char_length(name_ko) <= 60)),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  -- A category that still has items cannot be deleted (FR-42). NO ACTION reports the same
  -- error code (23503) on every Postgres version; RESTRICT changed its code in Postgres 18.
  category_id uuid not null references public.categories (id) on delete no action,
  name_en text not null
    constraint items_name_en_length check (btrim(name_en) <> '' and char_length(name_en) <= 80),
  name_fil text
    constraint items_name_fil_length
    check (name_fil is null or (btrim(name_fil) <> '' and char_length(name_fil) <= 80)),
  name_ko text
    constraint items_name_ko_length
    check (name_ko is null or (btrim(name_ko) <> '' and char_length(name_ko) <= 80)),
  description_en text not null default ''
    constraint items_description_en_length check (char_length(description_en) <= 500),
  description_fil text
    constraint items_description_fil_length
    check (description_fil is null or char_length(description_fil) <= 500),
  description_ko text
    constraint items_description_ko_length
    check (description_ko is null or char_length(description_ko) <= 500),
  -- Whole centavos avoid rounding errors. Upper limit: 100,000 pesos.
  price_centavos integer not null
    constraint items_price_range check (price_centavos between 0 and 10000000),
  -- Folder of the stored photo sizes; must belong to this item (docs/BACKEND-SCHEMA.md section 6).
  photo_path text
    constraint items_photo_path_format
    check (photo_path is null or photo_path ~ ('^items/' || id::text || '/[0-9]+$')),
  -- New items start hidden, so staff can finish them before publishing.
  is_published boolean not null default false,
  is_available boolean not null default true,
  -- True only in seed data (D-010).
  is_sample boolean not null default false,
  sort_order integer not null default 0,
  availability_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- When true, this staff member can write only from a two-factor (aal2) session (FR-47).
  require_mfa boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row only. Bumped by trigger on every change to items or categories; visitors
-- subscribe to it for live updates (D-020).
create table public.menu_state (
  id smallint primary key default 1 constraint menu_state_single_row check (id = 1),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.menu_state (id) values (1);

-- Written only by the contact Edge Function (service role). Deleted by a scheduled job
-- when the retention period ends (NFR-PRIV-03).
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint contact_messages_name_length check (btrim(name) <> '' and char_length(name) <= 80),
  contact text not null
    constraint contact_messages_contact_length check (char_length(contact) between 5 and 120),
  message text not null
    constraint contact_messages_message_length
    check (btrim(message) <> '' and char_length(message) <= 1000),
  locale text not null
    constraint contact_messages_locale check (locale in ('en', 'fil', 'ko')),
  -- Only the five UTM keys, and only with consent (FR-57).
  utm jsonb
    constraint contact_messages_utm_keys
    check (
      utm is null
      or (
        jsonb_typeof(utm) = 'object'
        and utm - array['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] = '{}'::jsonb
      )
    ),
  created_at timestamptz not null default now()
);

-- Fixed-window counters for server functions (NFR-SEC-16). Keys hold salted hashes,
-- never raw IP addresses.
create table public.rate_limits (
  key text primary key constraint rate_limits_key_length check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits integer not null constraint rate_limits_hits_positive check (hits >= 0)
);

create index items_category_sort_idx on public.items (category_id, sort_order);
create index items_published_idx on public.items (category_id, sort_order) where is_published;
create index categories_sort_idx on public.categories (sort_order);
create index contact_messages_created_idx on public.contact_messages (created_at desc);
create index rate_limits_window_idx on public.rate_limits (window_start);
