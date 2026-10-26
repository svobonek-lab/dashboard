begin;

create table if not exists public.app_email_outbox_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null,
  completed_at timestamptz,
  stale_lead_alerts_queued integer not null default 0 check (stale_lead_alerts_queued >= 0),
  selected_count integer not null default 0 check (selected_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_code text check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  constraint app_email_outbox_runs_window check (
    (status = 'running' and completed_at is null)
    or (status <> 'running' and completed_at >= started_at)
  )
);

create index if not exists app_email_outbox_runs_completed_idx
  on public.app_email_outbox_runs (completed_at desc);

alter table public.app_email_outbox_runs enable row level security;
revoke all on table public.app_email_outbox_runs from public, anon, authenticated;
grant select, insert, update on table public.app_email_outbox_runs to service_role;

commit;
