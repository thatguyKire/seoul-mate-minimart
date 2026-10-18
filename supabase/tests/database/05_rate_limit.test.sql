-- The fixed-window rate limiter used by server functions (NFR-SEC-16).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

truncate public.rate_limits;

select is(public.check_rate_limit('test:a', 2, 60), 0, 'The first request is allowed');
select is(public.check_rate_limit('test:a', 2, 60), 0, 'The second request is allowed');
-- Materialized so the limiter runs exactly once (BETWEEN would evaluate it twice).
with attempt as materialized (select public.check_rate_limit('test:a', 2, 60) as retry_after)
select ok(retry_after between 1 and 60, 'The third request is refused, with a retry time inside the window')
from attempt;
select is((select hits from public.rate_limits where key = 'test:a'), 3, 'Every request is counted');

update public.rate_limits set window_start = now() - interval '61 seconds' where key = 'test:a';
select is(public.check_rate_limit('test:a', 2, 60), 0, 'A new window allows requests again');
select is((select hits from public.rate_limits where key = 'test:a'), 1, 'The count restarts in a new window');
select is(public.check_rate_limit('test:b', 2, 60), 0, 'Each key is counted separately');
select throws_ok($$ select public.check_rate_limit('test:c', 0, 60) $$, '22023', null, 'Invalid limits are rejected');

set local role service_role;
select lives_ok($$ select public.check_rate_limit('test:d', 5, 60) $$, 'Server functions (service role) can call the rate limiter');
reset role;

select * from finish();
rollback;
