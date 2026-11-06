$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$database = 'stavba-invitation-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
Push-Location $repo
try {
    docker run --pull never --rm -d --name $database --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17
    if ($LASTEXITCODE) { throw 'Disposable PostgreSQL could not start' }
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        docker exec $database pg_isready -h localhost -U postgres *> $null
        if (!$LASTEXITCODE) { break }
        Start-Sleep -Seconds 1
    }
    function Invoke-FixtureSql([string] $Sql) {
        $Sql | docker exec -i $database psql -q -v ON_ERROR_STOP=1 -U postgres
        if ($LASTEXITCODE) { throw 'Disposable SQL verification failed' }
    }
    function Invoke-FixtureFile([string] $Path) {
        Invoke-FixtureSql (Get-Content -Raw -LiteralPath $Path)
    }
    Invoke-FixtureFile 'supabase/tests/platform_admin_setup.sql'
    Invoke-FixtureFile 'supabase/staging/20261005_platform_admin_contract.sql'
    Invoke-FixtureFile 'supabase/staging/20261009_platform_admin_support_contract.sql'
    Invoke-FixtureFile 'supabase/tests/outbox_legacy_compat_setup.sql'
    Invoke-FixtureSql @'
create schema if not exists app_private;
create function public.app_claim_invites() returns integer language sql as $$ select 1 $$;
create function public.app_invite(uuid,text,text) returns integer language sql as $$ select 1 $$;
alter table public.app_invites drop column accepted_by;
alter table public.app_companies add column subscription_status text;
-- Reproduce the real staging privacy constraint, absent from the old fixture.
alter table public.app_companies add column privacy_url text not null default '';
alter table public.app_companies add constraint app_companies_check
  check ((not public_form) or (privacy_url ~ '^https://[^[:space:]]+$'));
-- Match the partially deployed directory signature observed in staging.
drop function public.app_platform_list_companies(uuid);
create function public.app_platform_list_companies(p_actor_user_id uuid)
returns table(id uuid,name text,slug text,active boolean,onboarding_completed boolean,
 created_at timestamptz,member_count bigint,subscription_status text,
 invitation_status text,first_lead_at timestamptz)
language sql as $$ select null::uuid,null::text,null::text,null::boolean,null::boolean,
 null::timestamptz,null::bigint,null::text,null::text,null::timestamptz where false $$;
alter table auth.users add column invited_at timestamptz, add column encrypted_password text, add column raw_app_meta_data jsonb;
create function public.app_role(c uuid) returns text language sql stable security definer set search_path='' as $$
 select m.role from public.app_members m join public.app_companies co on co.id=m.company_id
 where m.company_id=c and m.user_id=auth.uid() and m.active and co.active
$$;
'@
    $bundle = node scripts/prepare-invitation-rollout.mjs
    if ($LASTEXITCODE) { throw 'Review bundle generation failed' }
    Invoke-FixtureSql ($bundle -join [Environment]::NewLine)
    Invoke-FixtureSql @'
do $$ declare violated text; begin
  begin
    insert into public.app_platform_admins(user_id,active)
    values ('90000000-0000-4000-8000-000000000009',true);
    perform public.app_platform_create_company_onboarding(
      '90000000-0000-4000-8000-000000000009','Privacy regression','privacy-regression',
      'Fixture owner','privacy@example.test','pilot',now(),now());
    raise exception 'Expected legacy onboarding to violate the privacy constraint';
  exception when check_violation then
    get stacked diagnostics violated = CONSTRAINT_NAME;
    if violated <> 'app_companies_check' then raise; end if;
  end;
  if exists(select 1 from public.app_companies where slug='privacy-regression') then
    raise exception 'Failed onboarding left a company behind';
  end if;
end $$;
'@
    Invoke-FixtureFile 'docs/reviews/2026-11-06-invitation-private-form.sql'
    Invoke-FixtureFile 'docs/reviews/2026-11-06-invitation-private-form.sql'
    Invoke-FixtureFile 'supabase/tests/invitation_rollout_verify.sql'
    Invoke-FixtureSql ($bundle -join [Environment]::NewLine)
    Invoke-FixtureFile 'docs/reviews/2026-11-06-invitation-private-form.sql'
    Invoke-FixtureFile 'supabase/staging/20261104_retire_legacy_invitation_rpcs.sql'
    Invoke-FixtureSql @'
set role authenticated;
do $$ begin
 begin
  perform public.app_claim_invites();
  raise exception 'Legacy claim RPC was callable';
 exception when insufficient_privilege then null; end;
 begin
  perform public.app_invite('30000000-0000-4000-8000-000000000003','fixture@example.test','Fixture');
  raise exception 'Legacy invite RPC was callable';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
'@
    Write-Output 'PASS integrated invitation rollout and repeat-safe schema'
} finally {
    docker stop $database | Out-Null
    Pop-Location
}
