-- Session B: start this while session A holds the company row lock. Once A
-- commits the fifth seat, this insert must fail with SEAT_LIMIT_REACHED.
\set ON_ERROR_STOP on
insert into public.app_invites(company_id, email, name, role, expires_at)
values ('11000000-0000-4000-8000-000000000001', 'concurrent-b@example.invalid',
  'Concurrent B', 'employee', clock_timestamp() + interval '7 days');
