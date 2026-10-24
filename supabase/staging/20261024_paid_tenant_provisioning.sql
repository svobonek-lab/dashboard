-- STAGING ONLY. Requires existing Stripe billing, app_companies/app_members/app_invites.
-- Bootstrap only the legal evidence table if the earlier consent contract is absent.
-- Existing rows and invitation functions are preserved; no customer data is seeded.
begin;
create table if not exists public.app_company_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete restrict,
  invite_id uuid references public.app_invites(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  agreement text not null check (agreement in ('terms_of_service', 'data_processing_agreement')),
  agreement_version text not null default '2026-10-16',
  capture_source text not null check (capture_source in ('platform_company_onboarding', 'owner_invite_activation')),
  client_accepted_at timestamptz not null,
  accepted_at timestamptz not null default clock_timestamp(),
  unique(company_id, invite_id, actor_user_id, agreement, agreement_version, capture_source)
);

alter table public.app_company_legal_acceptances enable row level security;
revoke all on table public.app_company_legal_acceptances from public, anon, authenticated, service_role;
grant select, insert on table public.app_company_legal_acceptances to service_role;


create table if not exists public.app_paid_registration_intents (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null unique default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id),
 owner_email text not null,
 owner_name text not null,
 company_name text not null,
 slug text not null unique,
 plan text not null check(plan in ('pilot','starter','growth')),
 stripe_customer_id text not null unique,
 checkout_session_id text not null unique,
 client_accepted_at timestamptz not null,
 accepted_at timestamptz not null default clock_timestamp(),
 agreement_version text not null default '2026-10-16',
 expires_at timestamptz not null default clock_timestamp()+interval '24 hours',
 provisioned_at timestamptz
);
alter table public.app_paid_registration_intents enable row level security;
revoke all on public.app_paid_registration_intents from public,anon,authenticated;
grant select,insert on public.app_paid_registration_intents to service_role;

-- Defaults are actual persisted workspace configuration, not demo records.
create table if not exists public.app_workspace_defaults(
 company_id uuid primary key references public.app_companies(id) on delete cascade,
 settings jsonb not null default '{"kanban_statuses":["new","contacted","scheduled","quoted","won","in_progress","completed"],"integrations_enabled":false}'::jsonb,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.app_workspace_defaults enable row level security;
revoke all on public.app_workspace_defaults from public,anon,authenticated;
-- Access can be exposed through reviewed tenant settings API later.
-- Preserve append-only legal audit evidence and existing capture sources.
alter table public.app_company_legal_acceptances drop constraint if exists app_company_legal_acceptances_capture_source_check;
alter table public.app_company_legal_acceptances add constraint app_company_legal_acceptances_capture_source_check
check(capture_source in ('platform_company_onboarding','owner_invite_activation','paid_registration'));

create or replace function public.app_provision_paid_checkout(
 p_event_id text,p_event_created_at timestamptz,p_tenant_id uuid,
 p_customer_id text,p_subscription_id text,p_session_id text,
 p_payment_status text
) returns text language plpgsql security definer set search_path=''
as $$
declare v public.app_paid_registration_intents; v_email text; v_confirmed timestamptz; v_result text;
begin
 if p_payment_status is distinct from 'paid' then
  raise exception 'paid checkout required' using errcode='22023';
 end if;
 select * into v from public.app_paid_registration_intents where company_id=p_tenant_id for update;
 if not found then
  -- Existing customer renewals retain the reviewed billing contract.
  if not exists(select 1 from public.app_companies where id=p_tenant_id) then
   raise exception 'registered checkout intent required' using errcode='42501';
  end if;
  return public.app_apply_stripe_subscription_event(p_event_id,'checkout.session.completed',
    p_event_created_at,p_tenant_id,p_customer_id,p_subscription_id,'active',null);
 end if;
 if v.stripe_customer_id is distinct from p_customer_id
    or v.checkout_session_id is distinct from p_session_id then
  raise exception 'checkout intent binding mismatch' using errcode='42501';
 end if;
 if v.provisioned_at is null then
  if v.expires_at<=clock_timestamp() then raise exception 'registration expired' using errcode='42501'; end if;
  select lower(email),email_confirmed_at into v_email,v_confirmed from auth.users where id=v.owner_user_id for update;
  if v_confirmed is null or v_email is distinct from lower(v.owner_email) then
   raise exception 'verified registration identity required' using errcode='42501';
  end if;
  if exists(select 1 from public.app_members where user_id=v.owner_user_id and active) then
   raise exception 'registration identity already has membership' using errcode='23505';
  end if;
  -- Every insert and billing mutation is in this same RPC transaction.
  -- Any constraint/audit failure rolls back the entire company and membership.
  insert into public.app_companies(id,name,slug,email,plan,active,onboarding_completed,stripe_customer_id)
  values(v.company_id,v.company_name,v.slug,v.owner_email,v.plan,true,true,p_customer_id);
  insert into public.app_members(company_id,user_id,name,email,role,active)
  values(v.company_id,v.owner_user_id,v.owner_name,v.owner_email,'owner',true);
  insert into public.app_workspace_defaults(company_id) values(v.company_id);
  insert into public.app_company_legal_acceptances(company_id,actor_user_id,agreement,agreement_version,capture_source,client_accepted_at,accepted_at)
  values(v.company_id,v.owner_user_id,'terms_of_service',v.agreement_version,'paid_registration',v.client_accepted_at,v.accepted_at),
        (v.company_id,v.owner_user_id,'data_processing_agreement',v.agreement_version,'paid_registration',v.client_accepted_at,v.accepted_at);
  update public.app_paid_registration_intents set provisioned_at=clock_timestamp() where id=v.id;
 end if;
 v_result:=public.app_apply_stripe_subscription_event(p_event_id,'checkout.session.completed',
    p_event_created_at,p_tenant_id,p_customer_id,p_subscription_id,'active',null);
 return v_result;
end;
$$;
revoke all on function public.app_provision_paid_checkout(text,timestamptz,uuid,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.app_provision_paid_checkout(text,timestamptz,uuid,text,text,text,text)
to service_role;
commit;

begin;
alter table public.app_paid_registration_intents
 alter column stripe_customer_id drop not null,
 alter column checkout_session_id drop not null,
 add column if not exists request_id uuid;
create unique index if not exists app_paid_registration_request_unique on public.app_paid_registration_intents(owner_user_id,request_id);
create unique index if not exists app_paid_registration_owner_unique on public.app_paid_registration_intents(owner_user_id);

create or replace function public.app_prepare_paid_registration(
 p_user_id uuid,p_request_id uuid,p_name text,p_slug text,p_owner_name text,p_client_accepted_at timestamptz
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare v public.app_paid_registration_intents; v_email text; v_confirmed timestamptz;
begin
 if p_user_id is null or p_request_id is null or p_name is null or length(trim(p_name)) not between 1 and 160
 or p_owner_name is null or length(trim(p_owner_name)) not between 1 and 160
 or p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,79}$' then raise exception 'invalid registration' using errcode='22023'; end if;
 -- Serialize all requests from one verified identity, including different request IDs.
 select lower(email),email_confirmed_at into v_email,v_confirmed from auth.users where id=p_user_id for update;
 if v_confirmed is null then raise exception 'verified identity required' using errcode='42501'; end if;
 select * into v from public.app_paid_registration_intents where owner_user_id=p_user_id;
 if found then
  if v.request_id is distinct from p_request_id or v.company_name is distinct from trim(p_name)
    or v.owner_name is distinct from trim(p_owner_name) or v.slug is distinct from p_slug
    or v.client_accepted_at is distinct from p_client_accepted_at or v.expires_at<=clock_timestamp() then
   raise exception 'registration retry mismatch or expired' using errcode='23505';
  end if;
  return to_jsonb(v);
 end if;
 if p_client_accepted_at is null or p_client_accepted_at<clock_timestamp()-interval '15 minutes'
    or p_client_accepted_at>clock_timestamp()+interval '2 minutes' then raise exception 'current legal agreements required' using errcode='22023'; end if;
 if exists(select 1 from public.app_members where user_id=p_user_id and active) then raise exception 'existing member' using errcode='42501'; end if;
 if exists(select 1 from public.app_companies where slug=p_slug) then raise exception 'company slug unavailable' using errcode='23505'; end if;
 insert into public.app_paid_registration_intents(owner_user_id,owner_email,owner_name,company_name,slug,plan,request_id,client_accepted_at)
 values(p_user_id,v_email,trim(p_owner_name),trim(p_name),p_slug,'pilot',p_request_id,p_client_accepted_at)
 returning * into v;
 return to_jsonb(v);
end;
$$;
create or replace function public.app_bind_registration_checkout(p_intent_id uuid,p_customer_id text,p_session_id text)
returns void language plpgsql security definer set search_path=''
as $$
declare v public.app_paid_registration_intents;
begin
 if p_customer_id is null or p_customer_id !~ '^cus_[A-Za-z0-9]+$'
    or p_session_id is null or p_session_id !~ '^cs_[A-Za-z0-9_]+$' then raise exception 'invalid checkout binding' using errcode='22023'; end if;
 select * into v from public.app_paid_registration_intents where id=p_intent_id for update;
 if not found or v.expires_at<=clock_timestamp() or v.provisioned_at is not null then raise exception 'pending registration required' using errcode='42501'; end if;
 if (v.stripe_customer_id is not null and v.stripe_customer_id<>p_customer_id)
 or (v.checkout_session_id is not null and v.checkout_session_id<>p_session_id) then
  raise exception 'registration already bound' using errcode='23505';
 end if;
 update public.app_paid_registration_intents set stripe_customer_id=p_customer_id,checkout_session_id=p_session_id where id=v.id;
end;
$$;
revoke all on function public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.app_bind_registration_checkout(uuid,text,text) from public,anon,authenticated;
grant execute on function public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.app_bind_registration_checkout(uuid,text,text) to service_role;
commit;
