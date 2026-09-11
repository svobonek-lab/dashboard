-- RPC function to securely submit leads from the public embed widget

create or replace function public.submit_public_lead(
  p_org_id uuid,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_project_type text,
  p_budget numeric
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_org_status text;
  v_new_id uuid;
begin
  -- Validate presence of email or phone
  if p_customer_name is null or p_customer_name = '' then
    raise exception 'Jméno zákazníka je povinné';
  end if;

  if (p_email is null or p_email = '') and (p_phone is null or p_phone = '') then
    raise exception 'E-mail nebo telefonní číslo musí být vyplněno';
  end if;

  -- Verify active status of the organization
  select status into v_org_status from public.organizations where id = p_org_id;

  if v_org_status is null then
    raise exception 'Organizace nenalezena';
  end if;

  if v_org_status = 'Suspended' then
    raise exception 'Tato organizace není aktivní a nemůže přijímat nové poptávky';
  end if;

  -- Insert the public lead
  insert into public.leads (organization_id, customer_name, phone, email, project_type, budget, status)
  values (p_org_id, p_customer_name, p_phone, p_email, p_project_type, p_budget, 'New')
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Allow anonymous (unauthenticated) users to execute this function
grant execute on function public.submit_public_lead to anon;
