-- Disposable fixture only, never a production migration.
create role anon;
create role authenticated;
create role service_role bypassrls;
create role supabase_auth_admin;
create schema auth;
create schema app_private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
$$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema auth,app_private to authenticated;
create table public.app_companies(id uuid primary key, active boolean default true);
create table public.app_members(company_id uuid,user_id uuid,role text,active boolean default true);
create table public.app_leads(id uuid primary key,company_id uuid,title text,assigned_to uuid);
create function app_private.app_role(p uuid) returns text language sql stable security definer set search_path='' as
$$ select role from public.app_members where company_id=p and user_id=auth.uid() and active limit 1 $$;
create function app_private.app_can_lead(p uuid,l uuid) returns boolean language sql stable security definer set search_path='' as
$$ select exists(select 1 from public.app_leads where id=l and company_id=p and assigned_to=auth.uid()) $$;
-- Deliberately broad permissive policy simulates an IDOR-prone legacy policy.
-- The new restrictive boundary must still prevent every cross-tenant operation.
alter table public.app_companies enable row level security;
alter table public.app_members enable row level security;
alter table public.app_leads enable row level security;
create policy legacy_leads on public.app_leads for all to authenticated using(true) with check(true);
grant select,insert,update on public.app_leads to authenticated;
insert into auth.users values
('10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002'),
('30000000-0000-4000-8000-000000000003');
insert into public.app_companies values
('a0000000-0000-4000-8000-000000000001',true),
('b0000000-0000-4000-8000-000000000002',true);
insert into public.app_members values
('a0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner',true),
('b0000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','owner',true),
('a0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','employee',true);
insert into public.app_leads values
('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','A','30000000-0000-4000-8000-000000000003'),
('b1000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','B',null);

-- Storage fixture deliberately starts with broad old policies.
create schema storage;
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
create policy legacy_storage on storage.objects for all to authenticated using(true) with check(true);
insert into storage.objects(bucket_id,name) values
('lead-files','a0000000-0000-4000-8000-000000000001/a1000000-0000-4000-8000-000000000001/photo.jpg'),
('lead-files','b0000000-0000-4000-8000-000000000002/b1000000-0000-4000-8000-000000000002/foreign.jpg');
