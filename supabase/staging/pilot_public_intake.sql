-- Staging-only public intake repair. Not a production release.
begin;
alter table public.app_public_intake_events
  add column if not exists lead_id uuid references public.app_leads(id) on delete cascade;
create index if not exists app_public_intake_rate_idx
  on public.app_public_intake_events(company_id,created_at desc);

create or replace function public.app_get_public_company(p_public_key text)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
  select case when c.id is null then null else jsonb_build_object(
    'public_key',c.slug,'name',c.name,'color',c.color,'logo_url',c.logo_url,'active',c.active,'public_form',c.public_form
  ) end from public.app_companies c
  where c.active and c.public_form and c.slug=lower(trim(p_public_key)) limit 1
$$;
revoke all on function public.app_get_public_company(text) from public,authenticated;
grant execute on function public.app_get_public_company(text) to anon;

drop function if exists public.app_submit_public_lead(uuid,text,text,text,text,text,text,numeric);
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
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_company_id uuid; v_event_id uuid; v_lead_id uuid;
begin
  if nullif(trim(p_request_key),'') is null then raise exception 'request key is required'; end if;
  select id into v_company_id from public.app_companies
  where slug=lower(trim(p_public_key)) and active and public_form limit 1;
  if v_company_id is null then raise exception 'public form is not active'; end if;

  insert into public.app_public_intake_events(company_id,request_key)
  values(v_company_id,substr(trim(p_request_key),1,120))
  on conflict(company_id,request_key) do nothing returning id into v_event_id;
  if v_event_id is null then
    select lead_id into v_lead_id from public.app_public_intake_events
    where company_id=v_company_id and request_key=substr(trim(p_request_key),1,120);
    if v_lead_id is null then raise exception 'request is still being processed' using errcode='40001'; end if;
    return v_lead_id;
  end if;

  if (select count(*) from public.app_public_intake_events
      where company_id=v_company_id and created_at>now()-interval '1 minute')>20 then
    raise exception 'too many requests' using errcode='54000';
  end if;

  insert into public.app_leads(company_id,title,customer,email,phone,description,value,source,status)
  values(v_company_id,substr(trim(coalesce(p_title,'Nová poptávka')),1,160),
    substr(trim(coalesce(p_customer,'Zájemce')),1,160),substr(trim(coalesce(p_email,'')),1,160),
    substr(trim(coalesce(p_phone,'')),1,60),substr(trim(coalesce(p_description,'')),1,4000),
    greatest(coalesce(p_value,0),0),'public_form','new') returning id into v_lead_id;
  update public.app_public_intake_events set lead_id=v_lead_id where id=v_event_id;
  return v_lead_id;
end $$;
revoke all on function public.app_submit_public_lead(text,text,text,text,text,text,text,numeric) from public,authenticated;
grant execute on function public.app_submit_public_lead(text,text,text,text,text,text,text,numeric) to anon;
commit;
