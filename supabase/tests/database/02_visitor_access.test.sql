-- What a visitor (anon role) can and cannot do (FR-07, NFR-SEC-02).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Fixtures, created as the database owner. Seed data is cleared so counts are exact.
truncate public.items, public.categories, public.contact_messages, public.admins, public.rate_limits;
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

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select results_eq(
  $$ select name_en from public.items order by name_en $$,
  array['Chips', 'Milk', 'Ramen'],
  'Visitors see published items only, including out-of-stock ones'
);
select is_empty(
  $$ select id from public.items where id = 'd0000000-0000-4000-8000-000000000003' $$,
  'Visitors cannot see a hidden item, even by its id'
);
select results_eq($$ select count(*) from public.categories $$, array[2::bigint], 'Visitors can read categories');
select results_eq($$ select count(*) from public.menu_state $$, array[1::bigint], 'Visitors can read the menu version');
select throws_ok($$ select updated_by from public.items $$, '42501', null, 'Visitors cannot read audit columns');

select throws_ok(
  $$ insert into public.items (category_id, name_en, price_centavos) values ('c0000000-0000-4000-8000-000000000001', 'X', 1) $$,
  '42501', null, 'Visitors cannot add items'
);
select throws_ok($$ update public.items set price_centavos = 1 $$, '42501', null, 'Visitors cannot change items');
select throws_ok($$ delete from public.items $$, '42501', null, 'Visitors cannot delete items');
select throws_ok(
  $$ insert into public.categories (slug, name_en) values ('drinks', 'Drinks') $$,
  '42501', null, 'Visitors cannot add categories'
);
select throws_ok($$ update public.categories set name_en = 'X' $$, '42501', null, 'Visitors cannot change categories');
select throws_ok($$ delete from public.categories $$, '42501', null, 'Visitors cannot delete categories');
select throws_ok($$ update public.menu_state set version = 0 $$, '42501', null, 'Visitors cannot change the menu version');

select throws_ok($$ select * from public.contact_messages $$, '42501', null, 'Visitors cannot read contact messages');
select throws_ok(
  $$ insert into public.contact_messages (name, contact, message, locale) values ('A', '12345', 'B', 'en') $$,
  '42501', null, 'Visitors cannot write contact messages directly'
);
select throws_ok($$ select * from public.admins $$, '42501', null, 'Visitors cannot read the staff list');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'Visitors cannot read rate limit counters');
select throws_ok($$ select public.check_rate_limit('x', 1, 60) $$, '42501', null, 'Visitors cannot call the rate limiter');
select throws_ok(
  $$ select public.reorder_categories(array['c0000000-0000-4000-8000-000000000001'::uuid]) $$,
  '42501', null, 'Visitors cannot reorder categories'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('item-photos', 'items/d0000000-0000-4000-8000-000000000001/1/320.webp') $$,
  '42501', null, 'Visitors cannot upload photos'
);

reset role;
select * from finish();
rollback;
