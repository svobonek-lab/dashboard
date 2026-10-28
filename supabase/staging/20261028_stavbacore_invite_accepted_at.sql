-- STAGING-ONLY REVIEW ARTIFACT. Apply only after separate staging approval.
-- StavbaCore staging still has the legacy app_invites table. Owner reads and
-- export expect this nullable lifecycle field; legacy accepted invites are
-- deleted by app_claim_invites(), so existing pending rows remain NULL.

begin;

do $$
begin
  if to_regclass('public.app_invites') is null then
    raise exception 'public.app_invites is missing';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_invites'
      and column_name = 'accepted_at'
      and (data_type <> 'timestamp with time zone' or is_nullable <> 'YES')
  ) then
    raise exception 'public.app_invites.accepted_at has an incompatible type';
  end if;
end;
$$;

alter table public.app_invites
  add column if not exists accepted_at timestamptz;

commit;
