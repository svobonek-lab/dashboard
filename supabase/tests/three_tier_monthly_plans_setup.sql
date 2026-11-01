-- Reproduce the live StavbaCore Staging app_companies plan constraint
-- (plus one synthetic legacy business row) in disposable PostgreSQL.
alter table public.app_companies
  add constraint app_companies_plan_check
  check (plan in ('pilot', 'starter', 'business'));

insert into public.app_companies(id, name, plan)
values ('90000000-0000-4000-8000-000000000009', 'Legacy business fixture', 'business');
