-- STAGING-ONLY REVIEW ARTIFACT — NEVER APPLY AUTOMATICALLY OR TO PRODUCTION.
-- Stripe events are accepted only through the server-side service-role endpoint.

begin;

alter table public.app_companies
  add column if not exists subscription_status text not null default 'not_configured',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists stripe_event_created_at timestamptz;

update public.app_companies
set subscription_status = 'canceled'
where subscription_status = 'cancelled';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.app_companies'::regclass
      and conname = 'app_companies_subscription_status_check'
  ) then
    alter table public.app_companies
      add constraint app_companies_subscription_status_check
      check (subscription_status in ('not_configured', 'pilot', 'trial', 'active', 'past_due', 'canceled'));
  end if;
end;
$$;

create unique index if not exists app_companies_stripe_customer_unique
  on public.app_companies(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists app_companies_stripe_subscription_unique
  on public.app_companies(stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.app_stripe_webhook_events (
  event_id text primary key check (length(event_id) between 5 and 255),
  event_type text not null check (length(event_type) between 3 and 160),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  stripe_customer_id text not null check (length(stripe_customer_id) between 5 and 255),
  event_created_at timestamptz not null,
  result text not null check (result in ('applied', 'stale')),
  processed_at timestamptz not null default now()
);

alter table public.app_stripe_webhook_events enable row level security;
revoke all on table public.app_stripe_webhook_events from public, anon, authenticated, service_role;

create or replace function public.app_apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_tenant_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_subscription_status text,
  p_current_period_end timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company public.app_companies%rowtype;
  v_other_company_id uuid;
  v_inserted integer;
  v_result text := 'applied';
begin
  if p_event_id is null or length(p_event_id) not between 5 and 255
    or p_event_type not in ('checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted')
    or p_event_created_at is null
    or p_stripe_customer_id is null or length(p_stripe_customer_id) not between 5 and 255
    or p_stripe_subscription_id is null or length(p_stripe_subscription_id) not between 5 and 255
    or p_subscription_status not in ('active', 'past_due', 'canceled')
  then
    raise exception 'invalid Stripe subscription event' using errcode = '22023';
  end if;

  if exists (select 1 from public.app_stripe_webhook_events e where e.event_id = p_event_id) then
    return 'duplicate';
  end if;

  if p_tenant_id is not null then
    select * into v_company
    from public.app_companies c
    where c.id = p_tenant_id
    for update;
  else
    select * into v_company
    from public.app_companies c
    where c.stripe_customer_id = p_stripe_customer_id
    for update;
  end if;

  if v_company.id is null then
    raise exception 'Stripe tenant binding was not found' using errcode = 'P0002';
  end if;

  select c.id into v_other_company_id
  from public.app_companies c
  where c.stripe_customer_id = p_stripe_customer_id
    and c.id <> v_company.id;
  if v_other_company_id is not null then
    raise exception 'stripe customer is already bound to another tenant' using errcode = '23505';
  end if;

  if v_company.stripe_customer_id is not null
    and v_company.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'tenant is already bound to another Stripe customer' using errcode = '23505';
  end if;

  if v_company.stripe_subscription_id is not null
    and v_company.stripe_subscription_id <> p_stripe_subscription_id
  then
    raise exception 'tenant is already bound to another Stripe subscription' using errcode = '23505';
  end if;

  if v_company.stripe_event_created_at is not null
    and p_event_created_at < v_company.stripe_event_created_at
  then
    v_result := 'stale';
  end if;

  insert into public.app_stripe_webhook_events(
    event_id, event_type, company_id, stripe_customer_id, event_created_at, result
  ) values (
    p_event_id, p_event_type, v_company.id, p_stripe_customer_id, p_event_created_at, v_result
  )
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  if v_result = 'stale' then return v_result; end if;

  update public.app_companies
  set subscription_status = p_subscription_status,
      stripe_customer_id = p_stripe_customer_id,
      stripe_subscription_id = p_stripe_subscription_id,
      current_period_end = p_current_period_end,
      stripe_event_created_at = p_event_created_at
  where id = v_company.id;

  return v_result;
end;
$$;

revoke all on function public.app_apply_stripe_subscription_event(
  text, text, timestamptz, uuid, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.app_apply_stripe_subscription_event(
  text, text, timestamptz, uuid, text, text, text, timestamptz
) to service_role;

-- If the platform directory is already installed, make it read the billing
-- state instead of the commercial onboarding plan. Dynamic SQL keeps this
-- billing contract independently testable before the platform module exists.
do $outer$
begin
  if to_regprocedure('public.app_platform_list_companies(uuid)') is not null then
    execute $function$
      create or replace function public.app_platform_list_companies(p_actor_user_id uuid)
      returns table (
        id uuid, name text, slug text, active boolean, onboarding_completed boolean,
        created_at timestamptz, member_count bigint, subscription_status text,
        invitation_status text, first_lead_at timestamptz
      )
      language plpgsql stable security definer set search_path = ''
      as $body$
      begin
        if p_actor_user_id is null or not exists (
          select 1 from public.app_platform_admins a
          where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
        ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;

        return query
        select c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at,
          count(distinct m.user_id) filter (where m.active = true)::bigint,
          coalesce(nullif(c.subscription_status, ''), 'not_configured')::text,
          case
            when bool_or(i.accepted_at is not null) then 'accepted'::text
            when count(i.id) > 0 then 'sent'::text
            else 'not_sent'::text
          end,
          min(l.created_at)
        from public.app_companies c
        left join public.app_members m on m.company_id = c.id
        left join public.app_invites i on i.company_id = c.id and i.role = 'owner' and i.revoked_at is null
        left join public.app_leads l on l.company_id = c.id
        group by c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at, c.subscription_status
        order by c.created_at desc;
      end;
      $body$
    $function$;
  end if;
end;
$outer$;

commit;
