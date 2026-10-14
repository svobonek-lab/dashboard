-- STAGING-ONLY PROPOSAL — DO NOT APPLY TO PRODUCTION AUTOMATICALLY.
-- Immediate, idempotent lead e-mail notifications. Delivery remains service-only.
begin;

alter table public.app_companies
  add column if not exists email_notifications boolean not null default true;

alter table public.app_leads
  add column if not exists assigned_to uuid;
alter table public.app_leads
  add column if not exists revision integer not null default 1;
alter table public.app_leads
  add column if not exists updated_at timestamptz not null default now();

alter table public.app_email_outbox
  add column if not exists event_key text;
alter table public.app_email_outbox
  add column if not exists notification_kind text;
alter table public.app_email_outbox
  add column if not exists lead_id uuid references public.app_leads(id) on delete cascade;

create unique index if not exists app_email_outbox_company_event_key_uidx
  on public.app_email_outbox(company_id, event_key);
create index if not exists app_email_outbox_pending_idx
  on public.app_email_outbox(status, scheduled_for, created_at)
  where status in ('pending', 'retry');

create or replace function public.app_queue_immediate_lead_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient text;
  v_event_key text;
  v_kind text;
  v_subject text;
  v_body text;
begin
  if not coalesce((select c.email_notifications from public.app_companies c where c.id = new.company_id and c.active), false) then
    return new;
  end if;

  if tg_op = 'INSERT' and new.source = any(array['widget', 'public_form', 'ai_inbox']) then
    select m.email into v_recipient
    from public.app_members m
    where m.company_id = new.company_id
      and m.role = 'owner'
      and m.active
      and nullif(trim(m.email), '') is not null
    order by m.user_id
    limit 1;
    v_kind := 'new_lead_owner';
    v_event_key := 'lead:new:' || new.id::text || ':owner';
    v_subject := 'Nová poptávka ve StavbaFlow';
    v_body := 'Nová poptávka od ' || left(coalesce(nullif(trim(new.customer), ''), 'zákazníka'), 160)
      || ': ' || left(new.title, 160)
      || '. Otevřít v aplikaci: https://dashboard-svobonek-6462s-projects.vercel.app/?lead=' || new.id::text;
  elsif tg_op = 'UPDATE'
    and new.assigned_to is distinct from old.assigned_to
    and new.assigned_to is not null then
    select m.email into v_recipient
    from public.app_members m
    where m.company_id = new.company_id
      and m.user_id = new.assigned_to
      and m.role = 'employee'
      and m.active
      and nullif(trim(m.email), '') is not null
    limit 1;
    v_kind := 'lead_assigned_employee';
    v_event_key := 'lead:assigned:' || new.id::text || ':employee:' || new.assigned_to::text || ':revision:' || new.revision::text;
    v_subject := 'Byla vám přiřazena zakázka ve StavbaFlow';
    v_body := left(coalesce(nullif(trim(new.customer), ''), 'Zákazník'), 160)
      || ' · ' || left(new.title, 160)
      || '. Otevřít v aplikaci: https://dashboard-svobonek-6462s-projects.vercel.app/?lead=' || new.id::text;
  else
    return new;
  end if;

  if nullif(trim(v_recipient), '') is null then return new; end if;

  insert into public.app_email_outbox(
    company_id, lead_id, event_key, notification_kind, recipient, subject, body, status, scheduled_for
  ) values (
    new.company_id, new.id, v_event_key, v_kind, v_recipient, v_subject, v_body, 'pending', now()
  )
  on conflict (company_id, event_key) do nothing;
  return new;
end;
$$;

drop trigger if exists app_queue_immediate_lead_email_trigger on public.app_leads;
create trigger app_queue_immediate_lead_email_trigger
after insert or update of assigned_to on public.app_leads
for each row execute function public.app_queue_immediate_lead_email();

revoke all on function public.app_queue_immediate_lead_email() from public, anon, authenticated;

create or replace function public.app_set_email_notifications(p_company_id uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.app_members m
    where m.company_id = p_company_id and m.user_id = auth.uid() and m.role = 'owner' and m.active
  ) then
    raise exception using errcode = '42501', message = 'owner membership required';
  end if;
  update public.app_companies set email_notifications = p_enabled where id = p_company_id;
  if not found then raise exception 'company not found'; end if;
  return p_enabled;
end;
$$;
revoke all on function public.app_set_email_notifications(uuid,boolean) from public, anon;
grant execute on function public.app_set_email_notifications(uuid,boolean) to authenticated;

commit;
