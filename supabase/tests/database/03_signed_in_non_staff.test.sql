-- A signed-in user who is not in admins gets no more than a visitor (FR-37, NFR-SEC-03).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

truncate public.items, public.categories, public.contact_messages, public.admins, public.rate_limits;
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-4000-8000-000000000001', 'staff@test.local', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000002', 'customer@test.local', 'authenticated', 'authenticated');
insert into public.admins (user_id) values ('a0000000-0000-4000-8000-000000000001');
insert into public.categories (id, slug, name_en, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'snacks', 'Snacks', 1),
  ('c0000000-0000-4000-8000-000000000002', 'noodles', 'Noodles', 2);
insert into public.items (id, category_id, name_en, price_centavos, is_published, is_available, sort_order) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Chips', 5000, true, true, 1),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Milk', 5000, true, false, 2),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Hidden snack', 5000, false, true, 3),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'Ramen', 5000, true, true, 1);
insert into public.contact_messages (name, contact, message, locale)
values ('Test Customer', 'test@example.com', 'Do you have Buldak?', 'en');

select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select is(public.is_admin(), false, 'A signed-in user who is not staff is not an admin');
select results_eq($$ select count(*) from public.items $$, array[3::bigint], 'Non-staff users see published items only');

with changed as (update public.items set price_centavos = 1 returning 1)
select is(count(*)::integer, 0, 'Non-staff users cannot change items') from changed;
with removed as (delete from public.items returning 1)
select is(count(*)::integer, 0, 'Non-staff users cannot delete items') from removed;
select throws_ok(
  $$ insert into public.items (category_id, name_en, price_centavos) values ('c0000000-0000-4000-8000-000000000001', 'X', 1) $$,
  '42501', null, 'Non-staff users cannot add items'
);

with changed as (update public.categories set name_en = 'Changed' returning 1)
select is(count(*)::integer, 0, 'Non-staff users cannot change categories') from changed;
select throws_ok(
  $$ insert into public.categories (slug, name_en) values ('drinks', 'Drinks') $$,
  '42501', null, 'Non-staff users cannot add categories'
);
with removed as (delete from public.categories returning 1)
select is(count(*)::integer, 0, 'Non-staff users cannot delete categories') from removed;
with changed as (update public.menu_state set version = 999 returning 1)
select is(count(*)::integer, 0, 'Non-staff users cannot change the menu version') from changed;

select is_empty($$ select * from public.contact_messages $$, 'Non-staff users cannot read contact messages');
select is_empty($$ select * from public.admins $$, 'Non-staff users cannot see the staff list');
select throws_ok(
  $$ select public.reorder_categories(array['c0000000-0000-4000-8000-000000000001'::uuid]) $$,
  '42501', null, 'Non-staff users cannot reorder categories'
);
select throws_ok($$ select public.check_rate_limit('x', 1, 60) $$, '42501', null, 'Non-staff users cannot call the rate limiter');
select throws_ok(
  $$ insert into public.admins (user_id) values ('a0000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'Users cannot make themselves staff'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('item-photos', 'items/d0000000-0000-4000-8000-000000000001/1/320.webp') $$,
  '42501', null, 'Non-staff users cannot upload photos'
);

reset role;
select results_eq(
  $$ select price_centavos from public.items order by id $$,
  array[5000, 5000, 5000, 5000],
  'Item prices are unchanged afterwards'
);
select results_eq($$ select count(*) from public.categories $$, array[2::bigint], 'Categories are unchanged afterwards');

select * from finish();
rollback;
