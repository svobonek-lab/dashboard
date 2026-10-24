-- Disposable supplement after stripe_billing_setup + paid_provisioning_setup.
create role supabase_auth_admin;
create schema app_private;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema auth,app_private to authenticated;
create table public.app_leads(id uuid primary key,company_id uuid,title text,assigned_to uuid);
create function app_private.app_role(p uuid) returns text language sql stable security definer set search_path='' as
$$ select role from public.app_members where company_id=p and user_id=auth.uid() and active limit 1 $$;
create function app_private.app_can_lead(p uuid,l uuid) returns boolean language sql stable security definer set search_path='' as
$$ select exists(select 1 from public.app_leads where id=l and company_id=p and assigned_to=auth.uid()) $$;
alter table public.app_members enable row level security;
alter table public.app_leads enable row level security;
grant select on public.app_members,public.app_companies to authenticated;
grant select,insert,update on public.app_leads to authenticated;
create policy members_scope on public.app_members for select to authenticated using(app_private.app_role(company_id) is not null);
create policy company_scope on public.app_companies for select to authenticated using(app_private.app_role(id) is not null);
create policy leads_owner on public.app_leads for all to authenticated using(app_private.app_role(company_id)='owner') with check(app_private.app_role(company_id)='owner');
