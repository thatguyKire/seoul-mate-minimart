-- Functions and triggers. Design: docs/BACKEND-SCHEMA.md section 4.
-- Every function is SECURITY INVOKER with a fixed, empty search_path and schema-qualified
-- names (NFR-SEC-05). There are no SECURITY DEFINER functions.

-- True when the caller is listed in admins, and has a two-factor session if require_mfa is set.
-- Works without SECURITY DEFINER because staff may read their own admins row.
create function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = (select auth.uid())
      and (not a.require_mfa or (select auth.jwt() ->> 'aal') = 'aal2')
  );
$$;

-- Audit fields are always set by the database, never trusted from the client.
create function public.categories_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create function public.items_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.availability_changed_at := now();
  else
    new.created_at := old.created_at;
    if new.is_available is distinct from old.is_available then
      new.availability_changed_at := now();
    else
      new.availability_changed_at := old.availability_changed_at;
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

-- One bump per statement, so a bulk change causes one live update, not one per row (D-020).
create function public.bump_menu_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.menu_state
  set version = version + 1, updated_at = now()
  where id = 1;
  return null;
end;
$$;

create trigger categories_before_write
  before insert or update on public.categories
  for each row execute function public.categories_before_write();

create trigger items_before_write
  before insert or update on public.items
  for each row execute function public.items_before_write();

create trigger categories_bump_menu
  after insert or update or delete on public.categories
  for each statement execute function public.bump_menu_state();

create trigger items_bump_menu
  after insert or update or delete on public.items
  for each statement execute function public.bump_menu_state();

-- Sets sort_order from the array order in one transaction. Any id that RLS hides or that
-- does not exist makes the whole call fail.
create function public.reorder_categories(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception 'p_ids must not be empty' using errcode = '22023';
  end if;
  if cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) as x) then
    raise exception 'p_ids must not contain duplicates' using errcode = '22023';
  end if;

  update public.categories c
  set sort_order = o.position::integer
  from unnest(p_ids) with ordinality as o (id, position)
  where c.id = o.id;

  get diagnostics updated_count = row_count;
  if updated_count <> cardinality(p_ids) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

create function public.reorder_items(p_category_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception 'p_ids must not be empty' using errcode = '22023';
  end if;
  if cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) as x) then
    raise exception 'p_ids must not contain duplicates' using errcode = '22023';
  end if;

  update public.items i
  set sort_order = o.position::integer
  from unnest(p_ids) with ordinality as o (id, position)
  where i.id = o.id
    and i.category_id = p_category_id;

  get diagnostics updated_count = row_count;
  if updated_count <> cardinality(p_ids) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

-- Counts one hit in a fixed window with a single atomic upsert. Returns 0 when allowed,
-- otherwise the seconds until the window resets (used for Retry-After).
create function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  window_length interval;
  current_window_start timestamptz;
  current_hits integer;
begin
  if p_key is null or p_max is null or p_max < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;
  window_length := make_interval(secs => p_window_seconds);

  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
  set
    window_start = case when r.window_start <= now() - window_length then now() else r.window_start end,
    hits = case when r.window_start <= now() - window_length then 1 else r.hits + 1 end
  returning r.window_start, r.hits into current_window_start, current_hits;

  if current_hits <= p_max then
    return 0;
  end if;
  return greatest(1, ceil(extract(epoch from (current_window_start + window_length - now())))::integer);
end;
$$;
