-- STAGING ONLY. Requires existing Stripe billing and legal audit contracts.
begin;
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
