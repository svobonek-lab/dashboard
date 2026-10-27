-- Public intake hardening proposal. Apply only after schema review and disposable verification.
begin;

alter table public.app_public_intake_events
  add column if not exists lead_id uuid references public.app_leads(id) on delete cascade,
  add column if not exists client_ip_hash text;

create index if not exists app_public_intake_company_ip_created_idx
  on public.app_public_intake_events(company_id, client_ip_hash, created_at desc);

create or replace function public.app_submit_public_lead(
  p_public_key text,
  p_request_key text,
  p_customer text,
  p_phone text,
  p_email text,
  p_title text,
  p_description text,
  p_value numeric,
  p_client_ip_hash text
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
  v_request_key text := pg_catalog.left(pg_catalog.btrim(p_request_key), 120);
begin
  if p_public_key is null or pg_catalog.length(pg_catalog.btrim(p_public_key)) > 120
     or p_request_key is null or pg_catalog.length(pg_catalog.btrim(p_request_key)) not between 1 and 120
     or p_customer is null or pg_catalog.length(pg_catalog.btrim(p_customer)) not between 1 and 120
     or p_phone is null or pg_catalog.length(pg_catalog.btrim(p_phone)) not between 1 and 30
     or pg_catalog.length(coalesce(p_email, '')) > 254
     or p_title is null or pg_catalog.length(pg_catalog.btrim(p_title)) not between 1 and 120
     or p_description is null or pg_catalog.length(pg_catalog.btrim(p_description)) not between 1 and 4000
     or p_value is null or p_value < 0 or p_value > 1000000000
     or p_client_ip_hash is null or p_client_ip_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'invalid public intake';
  end if;

  select c.id into v_company_id
  from public.app_companies c
  where c.slug = pg_catalog.lower(pg_catalog.btrim(p_public_key))
    and c.active and c.public_form
  limit 1;
  if v_company_id is null then
    raise exception using errcode = '22023', message = 'public form is not active';
  end if;

  -- Serialize requests for this company/IP pair so concurrent submissions cannot exceed five.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_company_id::text || ':' || p_client_ip_hash, 0)
  );

  select e.lead_id into v_lead_id
  from public.app_public_intake_events e
  where e.company_id = v_company_id and e.request_key = v_request_key;
  if found then
    if v_lead_id is null then
      raise exception using errcode = '40001', message = 'request is still being processed';
    end if;
    return v_lead_id;
  end if;

  if (select pg_catalog.count(*) from public.app_public_intake_events e
      where e.company_id = v_company_id
        and e.client_ip_hash = p_client_ip_hash
        and e.created_at > pg_catalog.now() - interval '10 minutes') >= 5 then
    raise exception using errcode = '54000', message = 'rate limited';
  end if;

  insert into public.app_public_intake_events(company_id, request_key, client_ip_hash)
  values (v_company_id, v_request_key, p_client_ip_hash)
  on conflict (company_id, request_key) do nothing
  returning id into v_event_id;
  if v_event_id is null then
    select e.lead_id into v_lead_id from public.app_public_intake_events e
      where e.company_id = v_company_id and e.request_key = v_request_key;
    if v_lead_id is null then
      raise exception using errcode = '40001', message = 'request is still being processed';
    end if;
    return v_lead_id;
  end if;

  insert into public.app_leads(company_id, title, customer, email, phone, description, value, source, status)
  values (v_company_id, pg_catalog.btrim(p_title), pg_catalog.btrim(p_customer),
    coalesce(pg_catalog.btrim(p_email), ''), pg_catalog.btrim(p_phone),
    pg_catalog.btrim(p_description), p_value, 'public_form', 'new')
  returning id into v_lead_id;

  update public.app_public_intake_events e set lead_id = v_lead_id where e.id = v_event_id;
  return v_lead_id;
end;
$$;

-- Revoke every historical overload, including the UUID contract, so legacy callers cannot bypass the proxy.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'app_submit_public_lead'
  loop
    execute pg_catalog.format('revoke all on function %s from public, anon, authenticated', fn.signature);
  end loop;
end;
$$;

grant execute on function public.app_submit_public_lead(text,text,text,text,text,text,text,numeric,text) to service_role;
commit;
