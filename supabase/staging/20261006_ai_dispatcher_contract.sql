-- STAGING-ONLY PROPOSAL — DO NOT APPLY TO PRODUCTION AUTOMATICALLY.
-- AI inbox idempotency and the dead-lead outbox are server-only boundaries.
begin;

-- Older staging snapshots created this table before intake events stored the
-- resulting lead. Keep this proposal repeatable across both staging shapes.
alter table public.app_public_intake_events
  add column if not exists lead_id uuid references public.app_leads(id) on delete cascade;
create index if not exists app_public_intake_rate_idx
  on public.app_public_intake_events(company_id, created_at desc);

create table if not exists public.app_ai_inbox_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  request_key text not null,
  lead_id uuid references public.app_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (company_id, request_key)
);
alter table public.app_ai_inbox_events enable row level security;
revoke all on table public.app_ai_inbox_events from public, anon, authenticated;
grant select, insert, update on table public.app_ai_inbox_events to service_role;

create table if not exists public.app_email_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.app_companies(id) on delete cascade,
  recipient text not null,
  subject text not null,
  body text not null default '',
  body_html text,
  status text not null default 'pending' check (status in ('pending','processing','delivered','retry','failed')),
  attempts integer not null default 0,
  provider_message_id text,
  scheduled_for timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_email_outbox add column if not exists company_id uuid references public.app_companies(id) on delete cascade;
alter table public.app_email_outbox enable row level security;
revoke all on table public.app_email_outbox from public, anon, authenticated;
grant select, insert, update on table public.app_email_outbox to service_role;

create table if not exists public.app_dead_lead_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  lead_id uuid not null references public.app_leads(id) on delete cascade,
  outbox_id uuid references public.app_email_outbox(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lead_id)
);
alter table public.app_dead_lead_notifications enable row level security;
revoke all on table public.app_dead_lead_notifications from public, anon, authenticated;
grant select, insert, update on table public.app_dead_lead_notifications to service_role;

create or replace function public.app_submit_ai_inbox_lead(
  p_company_id uuid,
  p_request_key text,
  p_customer text,
  p_phone text,
  p_title text,
  p_description text,
  p_location text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_lead_id uuid;
begin
  if nullif(trim(p_request_key), '') is null then raise exception 'request key is required'; end if;
  if not exists (select 1 from public.app_companies where id = p_company_id and active) then
    raise exception 'company is not active';
  end if;
  if (select count(*) from public.app_ai_inbox_events
      where company_id = p_company_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'too many requests';
  end if;

  insert into public.app_ai_inbox_events(company_id, request_key)
  values (p_company_id, substr(trim(p_request_key), 1, 160))
  on conflict (company_id, request_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select lead_id into v_lead_id from public.app_ai_inbox_events
    where company_id = p_company_id and request_key = substr(trim(p_request_key), 1, 160);
    if v_lead_id is null then raise exception 'request is still being processed'; end if;
    return v_lead_id;
  end if;

  insert into public.app_leads(
    company_id, title, customer, phone, address, description, status, priority, value, source
  ) values (
    p_company_id,
    substr(trim(p_title), 1, 160),
    substr(trim(coalesce(p_customer, 'Zájemce z e-mailu')), 1, 160),
    substr(trim(coalesce(p_phone, '')), 1, 60),
    substr(trim(coalesce(p_location, '')), 1, 500),
    substr(trim(p_description), 1, 4000),
    'new', 'normal', 0, 'ai_inbox'
  ) returning id into v_lead_id;

  update public.app_ai_inbox_events set lead_id = v_lead_id where id = v_event_id;
  return v_lead_id;
end;
$$;
revoke all on function public.app_submit_ai_inbox_lead(uuid,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.app_submit_ai_inbox_lead(uuid,text,text,text,text,text,text) to service_role;

-- Keep the existing anonymous, tenant-keyed widget boundary while recording a
-- source that the dashboard can identify explicitly.
create or replace function public.app_submit_public_lead(
  p_public_key text,
  p_request_key text,
  p_customer text,
  p_phone text,
  p_email text,
  p_title text,
  p_description text,
  p_value numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_event_id uuid;
  v_lead_id uuid;
begin
  if nullif(trim(p_request_key), '') is null then raise exception 'request key is required'; end if;
  select id into v_company_id from public.app_companies
    where slug = lower(trim(p_public_key)) and active and public_form limit 1;
  if v_company_id is null then raise exception 'public form is not active'; end if;

  insert into public.app_public_intake_events(company_id, request_key)
  values (v_company_id, substr(trim(p_request_key), 1, 120))
  on conflict (company_id, request_key) do nothing returning id into v_event_id;
  if v_event_id is null then
    select lead_id into v_lead_id from public.app_public_intake_events
      where company_id = v_company_id and request_key = substr(trim(p_request_key), 1, 120);
    if v_lead_id is null then raise exception 'request is still being processed'; end if;
    return v_lead_id;
  end if;
  if (select count(*) from public.app_public_intake_events
      where company_id = v_company_id and created_at > now() - interval '1 minute') > 20 then
    raise exception 'too many requests';
  end if;

  insert into public.app_leads(company_id,title,customer,email,phone,description,value,source,status)
  values (
    v_company_id,
    substr(trim(coalesce(p_title, 'Nová poptávka')), 1, 160),
    substr(trim(coalesce(p_customer, 'Zájemce')), 1, 160),
    substr(trim(coalesce(p_email, '')), 1, 160),
    substr(trim(coalesce(p_phone, '')), 1, 60),
    substr(trim(coalesce(p_description, '')), 1, 4000),
    greatest(coalesce(p_value, 0), 0),
    'widget', 'new'
  ) returning id into v_lead_id;
  update public.app_public_intake_events set lead_id = v_lead_id where id = v_event_id;
  return v_lead_id;
end;
$$;
revoke all on function public.app_submit_public_lead(text,text,text,text,text,text,text,numeric) from public, authenticated;
grant execute on function public.app_submit_public_lead(text,text,text,text,text,text,text,numeric) to anon;

create or replace function public.app_queue_stale_lead_alerts(p_older_than text default '24 hours')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_candidate record;
  v_notification_id uuid;
  v_outbox_id uuid;
begin
  if p_older_than <> '24 hours' then raise exception 'unsupported stale lead window'; end if;

  for v_candidate in
    select distinct on (l.id) l.id as lead_id, l.company_id, l.title, m.email
    from public.app_leads l
    join public.app_members m on m.company_id = l.company_id and m.role = 'owner' and m.active
    where l.status = 'new'
      and l.created_at <= now() - interval '24 hours'
      and nullif(trim(m.email), '') is not null
    order by l.id, m.user_id
  loop
    v_notification_id := null;
    insert into public.app_dead_lead_notifications(company_id, lead_id)
    values (v_candidate.company_id, v_candidate.lead_id)
    on conflict (lead_id) do nothing
    returning id into v_notification_id;
    if v_notification_id is null then continue; end if;

    insert into public.app_email_outbox(company_id, recipient, subject, body)
    values (
      v_candidate.company_id,
      v_candidate.email,
      'Nezodpovězená poptávka ve StavbaFlow',
      'Máte nezodpovězenou poptávku starší než 24 hodin: ' || substr(v_candidate.title, 1, 160)
    ) returning id into v_outbox_id;
    update public.app_dead_lead_notifications set outbox_id = v_outbox_id where id = v_notification_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.app_queue_stale_lead_alerts(text) from public, anon, authenticated;
grant execute on function public.app_queue_stale_lead_alerts(text) to service_role;

commit;
