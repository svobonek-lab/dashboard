-- STAGING-ONLY PROPOSAL. Baseline checked against StavbaCore Staging metadata.
begin;
do $$
begin
  if to_regclass('public.app_invites') is null
    or to_regclass('public.app_platform_audit_events') is null
    or to_regnamespace('app_private') is null
    or to_regprocedure('public.app_role(uuid)') is null then
    raise exception 'Invitation rollout baseline is missing';
  end if;
end;
$$;
alter table public.app_platform_audit_events add column if not exists target_id uuid;
alter table public.app_invites
  add column if not exists accepted_by uuid references auth.users(id) on delete set null;
commit;
