-- STAGING-ONLY PROPOSAL. Review against a fresh schema snapshot before applying.
-- Keeps generated one-time Auth links encrypted at rest and out of browser access.
begin;

do $$
begin
  if to_regclass('public.app_email_outbox') is null or to_regclass('public.app_invites') is null then
    raise exception 'Expected app_email_outbox and app_invites before adding invitation delivery.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_invites' and column_name='expires_at')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_invites' and column_name='accepted_at')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_invites' and column_name='role') then
    raise exception 'app_invites differs from the reviewed contract; no changes applied.';
  end if;
end;
$$;

alter table public.app_invites add column if not exists revoked_at timestamptz;

alter table public.app_email_outbox
  add column if not exists notification_kind text not null default 'email',
  add column if not exists invite_id uuid references public.app_invites(id) on delete cascade,
  add column if not exists template_data jsonb not null default '{}'::jsonb,
  add column if not exists invite_link_ciphertext text,
  add column if not exists invite_link_expires_at timestamptz,
  add column if not exists invite_link_lock_id uuid,
  add column if not exists invite_link_lock_until timestamptz,
  add column if not exists payload_generation integer not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.app_email_outbox'::regclass and conname='app_email_outbox_notification_kind_check') then
    alter table public.app_email_outbox add constraint app_email_outbox_notification_kind_check
      check (notification_kind in ('email', 'auth_invite'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.app_email_outbox'::regclass and conname='app_email_outbox_payload_generation_check') then
    alter table public.app_email_outbox add constraint app_email_outbox_payload_generation_check check (payload_generation > 0);
  end if;
end;
$$;

create unique index if not exists app_email_outbox_invite_unique
  on public.app_email_outbox(invite_id) where notification_kind='auth_invite';
create index if not exists app_email_outbox_invite_expiry_idx
  on public.app_email_outbox(status, invite_link_expires_at) where notification_kind='auth_invite';

alter table public.app_email_outbox enable row level security;
do $$
declare policy_row record;
begin
  for policy_row in select policyname from pg_policies where schemaname='public' and tablename='app_email_outbox' loop
    execute format('drop policy %I on public.app_email_outbox', policy_row.policyname);
  end loop;
end;
$$;
revoke all on table public.app_email_outbox from public, anon, authenticated;
grant select, insert, update on table public.app_email_outbox to service_role;

-- Return truthful onboarding status from the pending invite and its outbox row.
create or replace function public.app_platform_list_companies(p_actor_user_id uuid)
returns table (
  id uuid, name text, slug text, active boolean, onboarding_completed boolean,
  created_at timestamptz, member_count bigint, subscription_status text,
  invitation_status text, first_lead_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id=p_actor_user_id and a.active=true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode='42501'; end if;

  return query
  select c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at,
    count(distinct m.user_id) filter (where m.active=true)::bigint,
    coalesce(nullif(c.plan,''),'not_configured')::text,
    case
      when bool_or(i.accepted_at is not null) then 'accepted'::text
      when bool_or(o.last_error in ('AUTH_INVITE_USER_REVIEW_REQUIRED','AUTH_INVITE_SCOPE_MISMATCH')) then 'review_required'::text
      when bool_or(o.status in ('delivered','sent')) then 'sent'::text
      when bool_or(o.status in ('pending','retry','processing','sending')) then 'queued'::text
      when bool_or(o.status='failed') then 'failed'::text
      else 'not_sent'::text
    end,
    min(l.created_at)
  from public.app_companies c
  left join public.app_members m on m.company_id=c.id
  left join public.app_invites i on i.company_id=c.id and i.role='owner' and i.revoked_at is null
  left join public.app_email_outbox o on o.invite_id=i.id and o.notification_kind='auth_invite'
  left join public.app_leads l on l.company_id=c.id
  group by c.id,c.name,c.slug,c.active,c.onboarding_completed,c.created_at,c.plan
  order by c.created_at desc;
end;
$$;
revoke all on function public.app_platform_list_companies(uuid) from public, anon, authenticated;
grant execute on function public.app_platform_list_companies(uuid) to service_role;

-- Create employee invite and outbox row in one transaction so a process exit
-- cannot leave a successful invite without a durable delivery job.
create or replace function public.app_create_invite(p_company_id uuid, p_email text, p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_email text := lower(trim(coalesce(p_email,''))); v_name text := substr(trim(coalesce(p_name,'')),1,160); v_company_name text;
begin
  if public.app_role(p_company_id) <> 'owner' then raise exception 'owner membership required' using errcode='42501'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or v_name='' then raise exception 'invalid invite identity' using errcode='22023'; end if;
  select c.name into v_company_name from public.app_companies c where c.id=p_company_id and c.active=true;
  if v_company_name is null then raise exception 'active company required' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_company_id::text || ':' || v_email,0));
  select i.id into v_id from public.app_invites i
  where i.company_id=p_company_id and lower(i.email)=v_email and i.role='employee' and i.accepted_at is null
    and i.revoked_at is null and i.expires_at>clock_timestamp()
  order by i.created_at desc limit 1;
  if v_id is null then
    insert into public.app_invites(company_id,email,name,role,expires_at)
    values(p_company_id,v_email,v_name,'employee',clock_timestamp()+interval '7 days') returning id into v_id;
  end if;
  update public.app_email_outbox as o set recipient=v_email,subject='Pozvánka do StavbaFlow',
    template_data=jsonb_build_object('name',v_name,'company_name',v_company_name,'role','employee'),
    status='pending',attempts=0,scheduled_for=clock_timestamp(),last_error=null,
    invite_link_ciphertext=null,invite_link_expires_at=null,invite_link_lock_id=null,invite_link_lock_until=null,
    payload_generation=o.payload_generation+1,updated_at=clock_timestamp()
  where o.invite_id=v_id and o.notification_kind='auth_invite'
    and o.status in ('failed','delivered','sent')
    and o.last_error is distinct from 'OUTBOX_DELIVERY_STATE_UNKNOWN'
    and o.last_error is distinct from 'AUTH_INVITE_USER_REVIEW_REQUIRED'
    and o.last_error is distinct from 'AUTH_INVITE_SCOPE_MISMATCH';
  if not found then
    insert into public.app_email_outbox(company_id,invite_id,notification_kind,recipient,subject,template_data,status,attempts,scheduled_for,payload_generation)
    values(p_company_id,v_id,'auth_invite',v_email,'Pozvánka do StavbaFlow',jsonb_build_object('name',v_name,'company_name',v_company_name,'role','employee'),'pending',0,clock_timestamp(),1)
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;
revoke all on function public.app_create_invite(uuid,text,text) from public, anon;
grant execute on function public.app_create_invite(uuid,text,text) to authenticated;

-- Preserve the legal-consent contract and queue platform owner delivery in the
-- same transaction that creates the company, invite, consent evidence and audit.
create or replace function public.app_platform_create_company_onboarding(
  p_actor_user_id uuid, p_name text, p_slug text, p_owner_name text, p_owner_email text,
  p_plan text default 'pilot', p_terms_accepted_at timestamptz default null, p_dpa_accepted_at timestamptz default null
)
returns table(company_id uuid, invite_id uuid, slug text)
language plpgsql security definer set search_path = ''
as $$
declare v_company_id uuid; v_invite_id uuid; v_slug text:=lower(trim(coalesce(p_slug,''))); v_email text:=lower(trim(coalesce(p_owner_email,'')));
begin
  if p_actor_user_id is null or not exists(select 1 from public.app_platform_admins a where a.user_id=p_actor_user_id and a.active and a.revoked_at is null) then
    raise exception 'active platform administrator required' using errcode='42501';
  end if;
  if p_terms_accepted_at is null or p_dpa_accepted_at is null
    or p_terms_accepted_at < clock_timestamp()-interval '15 minutes' or p_dpa_accepted_at < clock_timestamp()-interval '15 minutes'
    or p_terms_accepted_at > clock_timestamp()+interval '2 minutes' or p_dpa_accepted_at > clock_timestamp()+interval '2 minutes' then
    raise exception 'legal consent required' using errcode='22023';
  end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 160 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug)>80
    or char_length(trim(coalesce(p_owner_name,''))) not between 2 and 160
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email)>254
    or coalesce(p_plan,'pilot')<>'pilot' then raise exception 'invalid onboarding input' using errcode='22023'; end if;
  insert into public.app_companies(name,slug,email,plan,public_form,onboarding_completed)
  values(trim(p_name),v_slug,v_email,'pilot',true,false) returning id into v_company_id;
  insert into public.app_invites(company_id,email,name,role,expires_at)
  values(v_company_id,v_email,trim(p_owner_name),'owner',clock_timestamp()+interval '7 days') returning id into v_invite_id;
  insert into public.app_company_legal_acceptances(company_id,invite_id,actor_user_id,agreement,capture_source,client_accepted_at) values
    (v_company_id,v_invite_id,p_actor_user_id,'terms_of_service','platform_company_onboarding',p_terms_accepted_at),
    (v_company_id,v_invite_id,p_actor_user_id,'data_processing_agreement','platform_company_onboarding',p_dpa_accepted_at);
  insert into public.app_email_outbox(company_id,invite_id,notification_kind,recipient,subject,template_data,status,attempts,scheduled_for,payload_generation)
  values(v_company_id,v_invite_id,'auth_invite',v_email,'Pozvánka do StavbaFlow',jsonb_build_object('name',trim(p_owner_name),'company_name',trim(p_name),'role','owner'),'pending',0,clock_timestamp(),1);
  insert into public.app_platform_audit_events(actor_user_id,action,company_id,target_id,outcome,reason_code)
  values(p_actor_user_id,'company_onboarding.created',v_company_id,v_invite_id,'allowed','platform_admin_request_with_legal_consent');
  return query select v_company_id,v_invite_id,v_slug;
end;
$$;
revoke all on function public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz) to service_role;

-- Reissue and queue as a single transaction; keep prior invite history revoked.
create or replace function public.app_platform_resend_owner_invite(p_actor_user_id uuid,p_company_id uuid)
returns table(invite_id uuid,owner_email text,owner_name text)
language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_name text; v_company_name text; v_invite_id uuid;
begin
  if not exists(select 1 from public.app_platform_admins a where a.user_id=p_actor_user_id and a.active and a.revoked_at is null) then raise exception 'active platform administrator required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('owner-resend:' || p_company_id::text,0));
  if exists(select 1 from public.app_members m where m.company_id=p_company_id and m.role='owner' and m.active) then raise exception 'owner already active' using errcode='22023'; end if;
  select i.id,i.email,i.name,c.name into v_invite_id,v_email,v_name,v_company_name from public.app_invites i join public.app_companies c on c.id=i.company_id
  where i.company_id=p_company_id and i.role='owner' and i.accepted_at is null and i.revoked_at is null and i.expires_at>clock_timestamp()
  order by i.created_at desc limit 1;
  if v_email is null or v_company_name is null then
    select i.email,i.name,c.name into v_email,v_name,v_company_name from public.app_invites i join public.app_companies c on c.id=i.company_id
    where i.company_id=p_company_id and i.role='owner' order by i.created_at desc limit 1;
    if v_email is null or v_company_name is null then raise exception 'owner invite not found' using errcode='P0002'; end if;
    update public.app_invites i set revoked_at=clock_timestamp() where i.company_id=p_company_id and i.role='owner' and i.accepted_at is null and i.revoked_at is null;
    insert into public.app_invites(company_id,email,name,role,expires_at) values(p_company_id,v_email,v_name,'owner',clock_timestamp()+interval '7 days') returning id into v_invite_id;
  end if;
  update public.app_email_outbox as o set recipient=v_email,subject='Pozvánka do StavbaFlow',
    template_data=jsonb_build_object('name',v_name,'company_name',v_company_name,'role','owner'),
    status='pending',attempts=0,scheduled_for=clock_timestamp(),last_error=null,
    invite_link_ciphertext=null,invite_link_expires_at=null,invite_link_lock_id=null,invite_link_lock_until=null,
    payload_generation=o.payload_generation+1,updated_at=clock_timestamp()
  where o.invite_id=v_invite_id and o.notification_kind='auth_invite'
    and o.status in ('failed','delivered','sent')
    and o.last_error is distinct from 'OUTBOX_DELIVERY_STATE_UNKNOWN'
    and o.last_error is distinct from 'AUTH_INVITE_USER_REVIEW_REQUIRED'
    and o.last_error is distinct from 'AUTH_INVITE_SCOPE_MISMATCH';
  if not found then
    insert into public.app_email_outbox(company_id,invite_id,notification_kind,recipient,subject,template_data,status,attempts,scheduled_for,payload_generation)
    values(p_company_id,v_invite_id,'auth_invite',v_email,'Pozvánka do StavbaFlow',jsonb_build_object('name',v_name,'company_name',v_company_name,'role','owner'),'pending',0,clock_timestamp(),1)
    on conflict do nothing;
  end if;
  insert into public.app_platform_audit_events(actor_user_id,action,company_id,target_id,outcome,reason_code)
  values(p_actor_user_id,'company_invite.resent',p_company_id,v_invite_id,'allowed','platform_admin_request');
  return query select v_invite_id,v_email,v_name;
end;
$$;
revoke all on function public.app_platform_resend_owner_invite(uuid,uuid) from public,anon,authenticated;
grant execute on function public.app_platform_resend_owner_invite(uuid,uuid) to service_role;

commit;
