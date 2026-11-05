\set ON_ERROR_STOP on

create table public.app_email_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  reminder_id uuid,
  recipient text not null,
  subject text not null,
  html text not null,
  status text not null default 'pending'
    constraint app_email_outbox_status_check check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  provider_id text,
  last_error text,
  scheduled_for timestamptz default now(),
  sent_at timestamptz,
  created_at timestamptz default now(),
  quote_id uuid,
  claimed_at timestamptz
);
alter table public.app_email_outbox enable row level security;
grant select on public.app_email_outbox to authenticated;
grant select, insert, update on public.app_email_outbox to service_role;

insert into public.app_email_outbox(id, company_id, recipient, subject, html, status, provider_id, sent_at, created_at)
values
  ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'owner-a@example.test', 'Queued fixture', '<p>queued</p>', 'pending', null, null, '2026-11-03T10:00:00Z'),
  ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'owner-a@example.test', 'Sent fixture', '<p>sent</p>', 'sent', 'provider-fixture-id', '2026-11-03T10:01:00Z', '2026-11-03T09:59:00Z');
