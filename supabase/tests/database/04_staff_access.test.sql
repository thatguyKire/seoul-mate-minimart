-- What staff (users in admins) can do, what is recorded, and the two-factor rule
-- (FR-37 to FR-42, FR-47, D-020).
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

truncate public.items, public.categories, public.contact_messages, public.admins, public.rate_limits;
insert into auth.users (id, email, aud, role) values
  ('a0000000-0000-4000-8000-000000000001', 'staff@test.local', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000002', 'customer@test.local', 'authenticated', 'authenticated'),
  ('a0000000-0000-4000-8000-000000000003', 'mfa-staff@test.local', 'authenticated', 'authenticated');
insert into public.admins (user_id, require_mfa) values
  ('a0000000-0000-4000-8000-000000000001', false),
  ('a0000000-0000-4000-8000-000000000003', true);
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

-- Give every item an old availability time, bypassing the trigger, so changes are visible.
alter table public.items disable trigger items_before_write;
update public.items set availability_changed_at = '2020-01-01T00:00:00Z';
alter table public.items enable trigger items_before_write;
create temporary table version_before as select version from public.menu_state;

-- Staff, password-only session.
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;

select is(public.is_admin(), true, 'A user in admins is staff');
select results_eq($$ select count(*) from public.items $$, array[4::bigint], 'Staff see every item, including hidden ones');
with changed as (update public.items set is_available = false where is_available returning 1)
select is(count(*)::integer, 3, 'Staff can mark all items out of stock in one statement') from changed;

reset role;
select is(
  (select version from public.menu_state),
  (select version + 1 from version_before),
  'Marking many items out of stock bumps the menu version once'
);
select ok(
  (select availability_changed_at > '2020-01-02T00:00:00Z' from public.items where id = 'd0000000-0000-4000-8000-000000000001'),
  'Switching availability records when it changed'
);
select is(
  (select updated_by from public.items where id = 'd0000000-0000-4000-8000-000000000001'),
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'The database records which staff member made the change'
);

set local role authenticated;
with changed as (update public.items set price_centavos = 6000 where id = 'd0000000-0000-4000-8000-000000000002' returning 1)
select is(count(*)::integer, 1, 'Staff can change a price') from changed;

reset role;
select is(
  (select availability_changed_at from public.items where id = 'd0000000-0000-4000-8000-000000000002'),
  '2020-01-01T00:00:00Z'::timestamptz,
  'Changing only the price keeps the availability time'
);

set local role authenticated;
select lives_ok(
  $$
    insert into public.items (id, category_id, name_en, price_centavos, updated_by)
    values ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'New snack', 100,
            'a0000000-0000-4000-8000-000000000002')
  $$,
  'Staff can add an item'
);
select lives_ok($$ insert into public.categories (slug, name_en) values ('drinks', 'Drinks') $$, 'Staff can add a category');

reset role;
select is(
  (select updated_by from public.items where id = 'd0000000-0000-4000-8000-000000000005'),
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'A client cannot fake who made a change'
);
select is(
  (select is_published from public.items where id = 'd0000000-0000-4000-8000-000000000005'),
  false,
  'New items start hidden'
);

set local role authenticated;
select lives_ok(
  $$ select public.reorder_categories(array['c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'Staff can reorder categories'
);
select results_eq(
  $$ select slug from public.categories where slug in ('snacks', 'noodles') order by sort_order $$,
  array['noodles', 'snacks'],
  'Categories follow the new order'
);
select throws_ok(
  $$ select public.reorder_categories(array['c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001']::uuid[]) $$,
  '22023', null, 'Reordering rejects duplicate ids'
);
select throws_ok(
  $$ select public.reorder_items('c0000000-0000-4000-8000-000000000001', array['d0000000-0000-4000-8000-000000000004']::uuid[]) $$,
  '42501', null, 'Reordering items rejects an item from another category'
);
select throws_ok(
  $$ delete from public.categories where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '23503', null, 'A category that still has items cannot be deleted'
);
select lives_ok($$ delete from public.items where id = 'd0000000-0000-4000-8000-000000000005' $$, 'Staff can delete an item');

select results_eq($$ select count(*) from public.contact_messages $$, array[1::bigint], 'Staff can read contact messages');
select throws_ok(
  $$ insert into public.contact_messages (name, contact, message, locale) values ('A', '12345', 'B', 'en') $$,
  '42501', null, 'Staff cannot write contact messages directly'
);
select throws_ok(
  $$ insert into public.admins (user_id) values ('a0000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'Staff cannot add other staff; only the owner can'
);
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'Staff cannot read rate limit counters');

select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('item-photos', 'items/d0000000-0000-4000-8000-000000000001/1700000000000/320.webp') $$,
  'Staff can upload a photo to the expected path'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('item-photos', 'other/anything.webp') $$,
  '42501', null, 'Staff cannot upload photos to any other path'
);

reset role;

-- Staff who must use two-factor login, password-only session.
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',
  true
);
set local role authenticated;
select is(public.is_admin(), false, 'Staff who must use two-factor login are not admins without it');
select throws_ok(
  $$ insert into public.categories (slug, name_en) values ('blocked', 'Blocked') $$,
  '42501', null, 'They cannot change data without two-factor login'
);
reset role;

-- The same staff member after two-factor login.
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);
set local role authenticated;
select is(public.is_admin(), true, 'Two-factor login makes them staff');
select lives_ok(
  $$ insert into public.categories (slug, name_en) values ('allowed', 'Allowed') $$,
  'They can change data after two-factor login'
);
reset role;

select * from finish();
rollback;
