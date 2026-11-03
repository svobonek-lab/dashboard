-- STAGING-ONLY PROPOSAL. Review against a fresh metadata snapshot before applying.
-- Adds the columns and states used by the server outbox worker while preserving
-- legacy queued rows, status values and columns. The sensitive queue is service-role-only.
begin;

do $$
begin
  if to_regclass('public.app_email_outbox') is null then
    raise exception 'Expected the existing staging public.app_email_outbox table.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'html'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'provider_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'sent_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'claimed_at'
  ) then
    raise exception 'Outbox shape differs from the reviewed legacy StavbaCore staging contract; no changes applied.';
  end if;
end;
$$;

alter table public.app_email_outbox
  add column if not exists body text not null default '',
  add column if not exists body_html text,
  add column if not exists provider_message_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.app_email_outbox
set body_html = coalesce(body_html, html),
    provider_message_id = coalesce(provider_message_id, provider_id),
    delivered_at = coalesce(delivered_at, sent_at),
    updated_at = coalesce(updated_at, claimed_at, sent_at, created_at, now());

alter table public.app_email_outbox
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
declare policy_row record;
begin
  for policy_row in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_email_outbox' loop
    execute format('drop policy %I on public.app_email_outbox', policy_row.policyname);
  end loop;
end;
$$;
revoke all on table public.app_email_outbox from public, anon, authenticated;
grant select, insert, update on table public.app_email_outbox to service_role;

alter table public.app_email_outbox
  drop constraint if exists app_email_outbox_status_check;
alter table public.app_email_outbox
  add constraint app_email_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled', 'processing', 'delivered', 'retry'));

create index if not exists app_email_outbox_worker_pending_idx
  on public.app_email_outbox(status, scheduled_for, created_at)
  where status in ('pending', 'retry');
create index if not exists app_email_outbox_worker_stale_idx
  on public.app_email_outbox(status, updated_at)
  where status in ('processing', 'sending');

commit;
