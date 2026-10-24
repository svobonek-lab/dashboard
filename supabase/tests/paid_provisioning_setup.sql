-- Disposable fixture supplement to stripe_billing_setup.sql + billing contract.
create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
alter table public.app_companies add column slug text unique, add column email text,
add column onboarding_completed boolean default false;
create table public.app_members(company_id uuid references public.app_companies(id),
user_id uuid references auth.users(id), name text,email text,role text,active boolean);
create table public.app_company_legal_acceptances(
 company_id uuid references public.app_companies(id), actor_user_id uuid references auth.users(id),
 agreement text, agreement_version text, capture_source text,
 client_accepted_at timestamptz,accepted_at timestamptz);
insert into auth.users values
('40000000-0000-4000-8000-000000000004','owner-a@example.invalid',clock_timestamp()),
('50000000-0000-4000-8000-000000000005','owner-b@example.invalid',clock_timestamp());
