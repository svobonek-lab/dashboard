-- SQL Trigger to automatically provision organization and user on email confirmation

create or replace function public.handle_user_confirmation()
returns trigger
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
  v_org_name text;
  v_slug text;
  v_user_exists boolean;
begin
  -- 1. Check if public.users entry already exists
  select exists(select 1 from public.users where id = NEW.id) into v_user_exists;
  
  if v_user_exists then
    return NEW;
  end if;

  -- 2. Extract orgName from user metadata, fallback to part of email + ' s.r.o.'
  v_org_name := coalesce(NEW.raw_user_meta_data->>'orgName', split_part(NEW.email, '@', 1) || ' s.r.o.');
  
  -- 3. Create a unique slug for organization
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random() * 1000)::text;
  v_slug := trim(both '-' from v_slug);

  -- 4. Insert new organization
  v_org_id := gen_random_uuid();
  insert into public.organizations (id, name, slug, primary_color, status)
  values (v_org_id, v_org_name, v_slug, '#2563eb', 'Active');

  -- 5. Insert new user linked to that organization
  insert into public.users (id, organization_id, role, email)
  values (NEW.id, v_org_id, 'owner', NEW.email);

  -- 6. Insert new organization member (supporting multi-tenant / switch_org structure)
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
