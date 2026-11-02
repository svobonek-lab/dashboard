-- Session A: run against the disposable setup after applying the migration.
-- Tenant A starts with four active employees. This transaction reserves its
-- fifth seat and holds the company row lock so session B must wait.
\set ON_ERROR_STOP on
begin;
insert into public.app_invites(company_id, email, name, role, expires_at)
values ('11000000-0000-4000-8000-000000000001', 'concurrent-a@example.invalid',
  'Concurrent A', 'employee', clock_timestamp() + interval '7 days');
\echo SEAT_LIMIT_SESSION_A_READY
select pg_sleep(5);
commit;
