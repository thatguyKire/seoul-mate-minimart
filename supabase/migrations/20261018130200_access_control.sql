-- Row Level Security, table and column privileges, function privileges.
-- Design: docs/BACKEND-SCHEMA.md section 3. Tests: supabase/tests/database.

alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.admins enable row level security;
alter table public.menu_state enable row level security;
alter table public.contact_messages enable row level security;
alter table public.rate_limits enable row level security;

-- Privileges: start from nothing for client roles, then grant back only what is needed.
-- Supabase grants everything to anon and authenticated by default; RLS alone would then be
-- the only barrier. Revoking adds a second one (NFR-SEC-02).
revoke all on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

-- Visitors may read only the columns the menu shows; audit columns stay hidden.
grant select (
  id, category_id,
  name_en, name_fil, name_ko,
  description_en, description_fil, description_ko,
  price_centavos, photo_path, is_available, is_sample, sort_order, availability_changed_at
) on public.items to anon;
grant select, insert, update, delete on public.items to authenticated;

grant select on public.admins to authenticated;

grant select on public.menu_state to anon, authenticated;
-- The bump trigger runs as the staff member, so staff need update here.
grant update on public.menu_state to authenticated;

grant select on public.contact_messages to authenticated;

-- rate_limits: no client privileges at all. Only server functions (service role) use it.

-- Functions: nobody may execute anything unless granted below. New functions are executable
-- by PUBLIC by default, so every later migration must revoke and grant explicitly; the
-- database tests fail if a function becomes callable by anon.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.reorder_categories(uuid[]) to authenticated;
grant execute on function public.reorder_items(uuid, uuid[]) to authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Policies. Policies call is_admin() wrapped in a select, so it runs once per statement.

create policy "Anyone can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "Staff can add categories"
  on public.categories for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Staff can change categories"
  on public.categories for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Staff can delete categories"
  on public.categories for delete
  to authenticated
  using ((select public.is_admin()));

create policy "Visitors can read published items"
  on public.items for select
  to anon
  using (is_published);

create policy "Users can read published items, staff can read all"
  on public.items for select
  to authenticated
  using (is_published or (select public.is_admin()));

create policy "Staff can add items"
  on public.items for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Staff can change items"
  on public.items for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Staff can delete items"
  on public.items for delete
  to authenticated
  using ((select public.is_admin()));

create policy "Staff can read their own admin row"
  on public.admins for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Anyone can read the menu version"
  on public.menu_state for select
  to anon, authenticated
  using (true);

create policy "Staff changes bump the menu version"
  on public.menu_state for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Staff can read contact messages"
  on public.contact_messages for select
  to authenticated
  using ((select public.is_admin()));
