-- REVIEW REQUIRED — apply only to isolated staging after the billing intent
-- contract and three-tier registration migration have been reviewed/applied.
-- Preserve the legacy `business` value while allowing current monthly plans.
begin;

do $$
begin
  if to_regclass('public.app_companies') is null then
    raise exception 'app_companies is required before enabling monthly plans';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.app_companies'::regclass
      and c.conname = 'app_companies_plan_check'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) =
        'CHECK ((plan = ANY (ARRAY[''pilot''::text, ''starter''::text, ''business''::text])))'
  ) then
    raise exception 'app_companies_plan_check differs from the reviewed staging contract';
  end if;
end;
$$;

alter table public.app_companies
  drop constraint app_companies_plan_check;

alter table public.app_companies
  add constraint app_companies_plan_check
  check (plan in ('pilot', 'starter', 'growth', 'pro', 'business')) not valid;

alter table public.app_companies
  validate constraint app_companies_plan_check;

commit;
