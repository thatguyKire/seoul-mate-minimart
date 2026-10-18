-- Server-side validation through column constraints (NFR-SEC-09). Runs as the owner, so
-- only constraints, not access rules, decide the outcome.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

truncate public.items, public.categories, public.contact_messages;
insert into public.categories (id, slug, name_en) values ('c0000000-0000-4000-8000-000000000001', 'snacks', 'Snacks');
insert into public.items (id, category_id, name_en, price_centavos)
values ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Chips', 5000);

select throws_ok(
  $$ insert into public.categories (slug, name_en) values ('Bad Slug', 'Bad') $$,
  '23514', null, 'Category slugs must be lowercase words joined by dashes'
);
select throws_ok(
  $$ insert into public.categories (slug, name_en) values ('blank', '   ') $$,
  '23514', null, 'Category names cannot be blank'
);
select throws_ok(
  $$ insert into public.items (category_id, name_en, price_centavos) values ('c0000000-0000-4000-8000-000000000001', 'X', -1) $$,
  '23514', null, 'Prices cannot be negative'
);
select throws_ok(
  $$ insert into public.items (category_id, name_en, price_centavos) values ('c0000000-0000-4000-8000-000000000001', 'X', 10000001) $$,
  '23514', null, 'Prices cannot exceed 100,000 pesos'
);
select throws_ok(
  $$ insert into public.items (category_id, name_en, price_centavos) values ('c0000000-0000-4000-8000-000000000001', repeat('x', 81), 1) $$,
  '23514', null, 'Item names are at most 80 characters'
);
select throws_ok(
  $$
    insert into public.items (id, category_id, name_en, price_centavos, photo_path)
    values ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'X', 1,
            'items/d0000000-0000-4000-8000-000000000001/1700000000000')
  $$,
  '23514', null, 'A photo path must belong to its own item'
);
select lives_ok(
  $$
    insert into public.items (id, category_id, name_en, price_centavos, photo_path)
    values ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'X', 1,
            'items/d0000000-0000-4000-8000-000000000003/1700000000000')
  $$,
  'A photo path in the item''s own folder is accepted'
);
select throws_ok(
  $$ insert into public.contact_messages (name, contact, message, locale) values ('A', '1234', 'Hi', 'en') $$,
  '23514', null, 'Contact details need at least 5 characters'
);
select throws_ok(
  $$ insert into public.contact_messages (name, contact, message, locale) values ('A', '12345', 'Hi', 'de') $$,
  '23514', null, 'Only the site''s three languages are accepted'
);
select throws_ok(
  $$
    insert into public.contact_messages (name, contact, message, locale, utm)
    values ('A', '12345', 'Hi', 'en', '{"utm_source": "facebook", "tracking_id": "x"}')
  $$,
  '23514', null, 'Only the five UTM keys can be stored'
);
select throws_ok($$ insert into public.menu_state (id) values (2) $$, '23514', null, 'The menu version table has one row only');
select throws_ok(
  $$ delete from public.categories where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '23503', null, 'A category with items cannot be deleted'
);

select * from finish();
rollback;
