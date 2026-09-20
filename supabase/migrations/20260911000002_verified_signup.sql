-- SQL Trigger to automatically provision organization and user on email confirmation

create or replace function public.handle_user_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_org_name text;
  v_slug text;
  v_role text;
  v_user_name text;
  v_user_exists boolean;
  v_meta_org_id text;
begin
  -- 1. Check if public.users entry already exists
  select exists(select 1 from public.users where id = NEW.id) into v_user_exists;
  
  if v_user_exists then
    return NEW;
  end if;

  v_meta_org_id := NEW.raw_user_meta_data->>'organization_id';
  v_role := coalesce(NEW.raw_user_meta_data->>'role', 'owner');
  v_user_name := coalesce(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Case A: User was invited to an existing organization
  if v_meta_org_id is not null and v_meta_org_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_org_id := v_meta_org_id::uuid;

    -- Insert public.users
    insert into public.users (id, organization_id, role, email, name)
    values (NEW.id, v_org_id, v_role, NEW.email, v_user_name)
    on conflict (id) do update set
      organization_id = EXCLUDED.organization_id,
      role = EXCLUDED.role,
      name = coalesce(public.users.name, EXCLUDED.name);

    -- Insert organization_members
    insert into public.organization_members (user_id, organization_id, role)
    values (NEW.id, v_org_id, v_role)
    on conflict (user_id, organization_id) do update set role = EXCLUDED.role;

    -- Link and activate corresponding employee profile if exists
    update public.employees
    set 
      user_id = NEW.id,
      invitation_status = 'Active',
      activated_at = now()
    where organization_id = v_org_id 
      and lower(email) = lower(NEW.email);

    return NEW;
  end if;

  -- Case B: Direct self-signup - create a new organization
  v_org_name := coalesce(NEW.raw_user_meta_data->>'orgName', split_part(NEW.email, '@', 1) || ' s.r.o.');
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random() * 1000)::text;
  v_slug := trim(both '-' from v_slug);

  v_org_id := gen_random_uuid();
  insert into public.organizations (id, name, slug, primary_color, status)
  values (v_org_id, v_org_name, v_slug, '#2563eb', 'Active');

  -- Insert new user linked to that organization
  insert into public.users (id, organization_id, role, email, name)
  values (NEW.id, v_org_id, 'owner', NEW.email, v_user_name);

  -- Insert new organization member
  insert into public.organization_members (user_id, organization_id, role)
  values (NEW.id, v_org_id, 'owner')
  on conflict (user_id, organization_id) do nothing;

  return NEW;
end;
$$;

-- Trigger to run after UPDATE or INSERT on auth.users when email is confirmed
drop trigger if exists on_user_email_confirmed on auth.users;
create trigger on_user_email_confirmed
  after insert or update on auth.users
  for each row
  when (NEW.email_confirmed_at is not null)
  execute function public.handle_user_confirmation();

