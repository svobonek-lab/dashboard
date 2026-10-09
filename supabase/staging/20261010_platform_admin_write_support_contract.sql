-- STAGING-ONLY REVIEW ARTIFACT — NEVER APPLY AUTOMATICALLY OR TO PRODUCTION.
-- Gives an active platform administrator a 30-minute, actor-bound support
-- workspace without creating tenant membership or exposing service credentials.
-- Every mutation is tenant-scoped by the stored session and audited in the
-- same transaction as the data change.

begin;

alter table public.app_platform_support_sessions
  drop constraint if exists app_platform_support_sessions_access_mode_check;
alter table public.app_platform_support_sessions
  add constraint app_platform_support_sessions_access_mode_check
  check (access_mode in ('read_only', 'full_support'));

create unique index if not exists app_platform_audit_request_once
  on public.app_platform_audit_events (support_session_id, request_id)
  where support_session_id is not null and request_id is not null;

alter table public.app_platform_audit_events
  add column if not exists target_id uuid;

create or replace function public.app_platform_create_support_session(
  p_actor_user_id uuid, p_company_id uuid, p_reason text
)
returns table (id uuid, company_id uuid, access_mode text, created_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_session public.app_platform_support_sessions%rowtype;
  v_created_at timestamptz := clock_timestamp();
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'valid support reason required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.app_companies c where c.id = p_company_id and c.active = true) then
    raise exception 'active company required' using errcode = '42501';
  end if;
  insert into public.app_platform_support_sessions(platform_admin_id, company_id, reason, access_mode, created_at, expires_at)
  values (p_actor_user_id, p_company_id, trim(p_reason), 'full_support', v_created_at, v_created_at + interval '30 minutes')
  returning * into v_session;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, support_session_id, outcome, reason_code)
  values (p_actor_user_id, 'support_session.created', p_company_id, v_session.id, 'allowed', 'operator_request');
  return query select v_session.id, v_session.company_id, v_session.access_mode, v_session.created_at, v_session.expires_at;
end;
$$;

create or replace function public.app_platform_get_support_session(p_actor_user_id uuid, p_session_id uuid)
returns table (
  id uuid, company_id uuid, company_name text, member_count bigint, subscription_status text,
  access_mode text, created_at timestamptz, expires_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare v_company_id uuid;
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  select s.company_id into v_company_id
  from public.app_platform_support_sessions s
  where s.id = p_session_id
    and s.platform_admin_id = p_actor_user_id
    and s.access_mode = 'full_support'
    and s.revoked_at is null and s.expires_at > clock_timestamp();
  if v_company_id is null then raise exception 'active full support session required' using errcode = '42501'; end if;

  insert into public.app_platform_audit_events(actor_user_id, action, company_id, support_session_id, outcome, reason_code)
  values (p_actor_user_id, 'support_session.viewed', v_company_id, p_session_id, 'allowed', 'operator_request');
  return query
  select s.id, c.id, c.name, count(m.user_id) filter (where m.active = true)::bigint,
    'not_configured'::text, s.access_mode, s.created_at, s.expires_at
  from public.app_platform_support_sessions s
  join public.app_companies c on c.id = s.company_id
  left join public.app_members m on m.company_id = c.id
  where s.id = p_session_id and s.platform_admin_id = p_actor_user_id
  group by s.id, c.id, c.name, s.access_mode, s.created_at, s.expires_at;
end;
$$;

create or replace function public.app_platform_support_workspace(p_actor_user_id uuid, p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_company_id uuid; v_result jsonb;
begin
  select s.company_id into v_company_id
  from public.app_platform_support_sessions s
  join public.app_platform_admins a on a.user_id = s.platform_admin_id
  where s.id = p_session_id
    and s.platform_admin_id = p_actor_user_id
    and s.access_mode = 'full_support'
    and s.revoked_at is null and s.expires_at > clock_timestamp()
    and a.active = true and a.revoked_at is null;
  if v_company_id is null then raise exception 'active full support session required' using errcode = '42501'; end if;

  select jsonb_build_object(
    'company', (select to_jsonb(c) from (
      select id, name, slug, email, phone, address, color, logo_url, active, onboarding_completed, plan
      from public.app_companies where id = v_company_id
    ) c),
    'members', coalesce((select jsonb_agg(to_jsonb(m) order by m.name) from (
      select company_id, user_id, name, email, role, active
      from public.app_members where company_id = v_company_id and active = true
    ) m), '[]'::jsonb),
    'leads', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc) from (
      select id, company_id, title, customer, email, phone, address, description, status,
        priority, assigned_to, scheduled_at, duration_minutes, value, source, created_at, updated_at, revision
      from public.app_leads where company_id = v_company_id
    ) l), '[]'::jsonb)
  ) into v_result;

  insert into public.app_platform_audit_events(actor_user_id, action, company_id, support_session_id, outcome, reason_code)
  values (p_actor_user_id, 'support_workspace.viewed', v_company_id, p_session_id, 'allowed', 'operator_request');
  return v_result;
end;
$$;

create or replace function public.app_platform_support_mutate_lead(
  p_actor_user_id uuid, p_session_id uuid, p_action text, p_lead_id uuid,
  p_payload jsonb, p_request_id text
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_company_id uuid;
  v_lead public.app_leads%rowtype;
  v_status text;
  v_priority text;
  v_assigned_to uuid;
  v_existing jsonb;
begin
  if p_action not in ('create_lead', 'update_lead', 'update_status')
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or p_request_id !~ '^[A-Za-z0-9._:-]{8,120}$' then
    raise exception 'invalid support mutation' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_payload) k
    where k not in ('title','customer','email','phone','address','description','status','priority','assigned_to','scheduled_at','duration_minutes','value','source')) then
    raise exception 'unsupported support field' using errcode = '22023';
  end if;

  select s.company_id into v_company_id
  from public.app_platform_support_sessions s
  join public.app_platform_admins a on a.user_id = s.platform_admin_id
  where s.id = p_session_id
    and s.platform_admin_id = p_actor_user_id
    and s.access_mode = 'full_support'
    and s.revoked_at is null and s.expires_at > clock_timestamp()
    and a.active = true and a.revoked_at is null;
  if v_company_id is null then raise exception 'active full support session required' using errcode = '42501'; end if;

  select to_jsonb(l) into v_existing
  from public.app_platform_audit_events e
  join public.app_leads l on l.company_id = e.company_id and l.id = e.target_id
  where e.support_session_id = p_session_id and e.request_id = p_request_id
  limit 1;
  if v_existing is not null then return v_existing; end if;

  v_status := coalesce(p_payload->>'status', 'new');
  v_priority := coalesce(p_payload->>'priority', 'normal');
  if v_status not in ('new','contacted','scheduled','in_progress','won','lost')
    or v_priority not in ('low','normal','high') then
    raise exception 'invalid lead status or priority' using errcode = '22023';
  end if;
  if p_payload ? 'assigned_to' and nullif(p_payload->>'assigned_to','') is not null then
    v_assigned_to := (p_payload->>'assigned_to')::uuid;
    if not exists (select 1 from public.app_members m where m.company_id = v_company_id and m.user_id = v_assigned_to and m.active = true) then
      raise exception 'assignee is not an active company member' using errcode = '42501';
    end if;
  end if;

  if p_action = 'create_lead' then
    insert into public.app_leads(company_id, title, customer, email, phone, address, description, status, priority,
      assigned_to, scheduled_at, duration_minutes, value, source)
    values (v_company_id, left(coalesce(p_payload->>'title',''),240), left(coalesce(p_payload->>'customer',''),240),
      left(coalesce(p_payload->>'email',''),320), left(coalesce(p_payload->>'phone',''),80), left(coalesce(p_payload->>'address',''),500),
      left(coalesce(p_payload->>'description',''),5000), v_status, v_priority, v_assigned_to,
      nullif(p_payload->>'scheduled_at','')::timestamptz, greatest(0, least(10080, coalesce((p_payload->>'duration_minutes')::int,0))),
      greatest(0, least(1000000000, coalesce((p_payload->>'value')::numeric,0))), left(coalesce(p_payload->>'source','manual'),80))
    returning * into v_lead;
  elsif p_action in ('update_lead','update_status') then
    if p_lead_id is null then raise exception 'lead id required' using errcode = '22023'; end if;
    update public.app_leads l set
      title = case when p_action='update_lead' and p_payload ? 'title' then left(p_payload->>'title',240) else l.title end,
      customer = case when p_action='update_lead' and p_payload ? 'customer' then left(p_payload->>'customer',240) else l.customer end,
      email = case when p_action='update_lead' and p_payload ? 'email' then left(p_payload->>'email',320) else l.email end,
      phone = case when p_action='update_lead' and p_payload ? 'phone' then left(p_payload->>'phone',80) else l.phone end,
      address = case when p_action='update_lead' and p_payload ? 'address' then left(p_payload->>'address',500) else l.address end,
      description = case when p_action='update_lead' and p_payload ? 'description' then left(p_payload->>'description',5000) else l.description end,
      status = case when p_payload ? 'status' then v_status else l.status end,
      priority = case when p_action='update_lead' and p_payload ? 'priority' then v_priority else l.priority end,
      assigned_to = case when p_action='update_lead' and p_payload ? 'assigned_to' then v_assigned_to else l.assigned_to end,
      scheduled_at = case when p_action='update_lead' and p_payload ? 'scheduled_at' then nullif(p_payload->>'scheduled_at','')::timestamptz else l.scheduled_at end,
      duration_minutes = case when p_action='update_lead' and p_payload ? 'duration_minutes' then greatest(0, least(10080,(p_payload->>'duration_minutes')::int)) else l.duration_minutes end,
      value = case when p_action='update_lead' and p_payload ? 'value' then greatest(0, least(1000000000,(p_payload->>'value')::numeric)) else l.value end,
      revision = l.revision + 1, updated_at = clock_timestamp()
    where l.id = p_lead_id and l.company_id = v_company_id
    returning * into v_lead;
    if v_lead.id is null then raise exception 'lead not found in support company' using errcode = '42501'; end if;
  end if;

  insert into public.app_platform_audit_events(actor_user_id, action, company_id, support_session_id, request_id, target_id, outcome, reason_code)
  values (p_actor_user_id, 'support.' || p_action, v_company_id, p_session_id, p_request_id, v_lead.id, 'allowed', 'operator_request');
  return to_jsonb(v_lead);
end;
$$;

revoke all on function public.app_platform_support_workspace(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_platform_support_mutate_lead(uuid, uuid, text, uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.app_platform_get_support_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.app_platform_support_workspace(uuid, uuid) to service_role;
grant execute on function public.app_platform_support_mutate_lead(uuid, uuid, text, uuid, jsonb, text) to service_role;
grant execute on function public.app_platform_get_support_session(uuid, uuid) to service_role;

commit;
