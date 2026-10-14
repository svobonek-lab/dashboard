\set ON_ERROR_STOP on

create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

insert into public.app_members(company_id, user_id, email, role, active)
values (
  '10000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000009',
  'employee-a@example.invalid',
  'employee',
  true
);
