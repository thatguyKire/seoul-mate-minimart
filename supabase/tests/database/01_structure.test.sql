-- Structural guardrails: these fail if a later migration forgets RLS, grants too much,
-- or adds an unsafe function (NFR-SEC-01, NFR-SEC-02, NFR-SEC-05).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is_empty(
  $$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  $$,
  'Every table in public has Row Level Security enabled'
);

select is_empty(
  $$ select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef $$,
  'No function in public is SECURITY DEFINER'
);

select is_empty(
  $$
    select p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) as setting where setting like 'search_path=%'
      )
  $$,
  'Every function in public sets a fixed search_path'
);

select is_empty(
  $$
    select t.tablename
    from pg_tables t
    where t.schemaname = 'public'
      and (
        has_any_column_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'INSERT')
        or has_any_column_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'UPDATE')
        or has_table_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'DELETE')
        or has_table_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'TRUNCATE')
      )
  $$,
  'Visitors cannot write to any table'
);

select set_eq(
  $$
    select t.tablename::text
    from pg_tables t
    where t.schemaname = 'public'
      and has_any_column_privilege('anon', format('%I.%I', t.schemaname, t.tablename), 'SELECT')
  $$,
  array['categories', 'items', 'menu_state'],
  'Visitors can read only categories, items and the menu version'
);

select ok(
  not has_column_privilege('anon', 'public.items', 'updated_by', 'SELECT'),
  'Visitors cannot read who last changed an item'
);

select is_empty(
  $$
    select p.proname
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE')
  $$,
  'Visitors cannot call any function in public'
);

select set_eq(
  $$
    select p.proname::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  $$,
  array['is_admin', 'reorder_categories', 'reorder_items'],
  'Signed-in users can call only is_admin and the reorder functions'
);

select ok(
  exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_state'
  ),
  'The menu version is published for live updates'
);

select * from finish();
rollback;
