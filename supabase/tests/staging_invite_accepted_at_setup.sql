create table public.app_invites (
  id uuid primary key,
  company_id uuid not null,
  email text not null,
  created_at timestamptz not null default now()
);

insert into public.app_invites (id, company_id, email)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'synthetic-invite@example.test'
);
