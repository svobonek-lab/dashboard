# StavbaCore Staging JWT reconciliation

Status: candidate revised after a fail-closed staging preflight rollback; corrected metadata-only SQL succeeded at `2026-10-27T14:51:12.694007Z`. No migration changes were committed to the live database.

## Snapshot and mismatch

- Source: metadata-only GitHub Actions run [40509027192](https://github.com/svobonek-lab/dashboard/actions/runs/40509027192), database capture at `2026-10-27T13:05:42.921293Z`.
- Target: StavbaCore Staging, project ref `xwzweltjvreqhjpbjrxa`. Production ref is `oncmtmrhmjlerbwkrecv`; it is a different project and must remain read-only.
- Snapshot includes 20 `public.app_*` tables, 202 columns, 36 policies, 32 functions, and 2 triggers. RLS is enabled on all 20 tables and FORCE RLS is not enabled on any.
- The snapshot's `information_schema.table_privileges` and `information_schema.column_privileges` queries returned empty arrays, but those arrays did not reflect the effective role ACLs. A follow-up read-only inspection of `pg_class.relacl`, `pg_attribute.attacl`, and `has_table_privilege` on 2026-10-27T14:36:43Z found the existing grants below. The metadata capture script now reads those catalog ACLs directly.
- The `app_*` set is `app_audit`, `app_companies`, `app_costs`, `app_demo_requests`, `app_email_outbox`, `app_handovers`, `app_imports`, `app_integrations`, `app_invites`, `app_invoices`, `app_job_budgets`, `app_leads`, `app_members`, `app_notes`, `app_quotes`, `app_rate_limits`, `app_reminders`, `app_requests`, `app_tasks`, `app_time_entries`.
- Tenant source columns are `app_companies.id`, and `company_id` on every other company-owned table. `app_demo_requests` is platform-admin scoped; `app_rate_limits` has no company key and a direct-deny policy; `app_requests` has a company key but a direct-deny policy. The candidate preserves existing demo-request column/table grants under its platform-only RLS policy and adds no rights to rate limits or requests.
- Existing RLS helpers are `public.app_role(uuid) RETURNS text` and `public.app_can_lead(uuid,uuid) RETURNS boolean`; both are SECURITY DEFINER with `search_path=public, pg_temp`. Policies call these public helpers, not `app_private.app_role`.
- Existing policy names, commands, and authenticated roles are checked by the candidate against all 36 rendered policies. The candidate also compares the exact effective `anon`/`authenticated` table privilege matrix and column ACL inventory before changing anything.
- Current table-level ACLs: `anon` has no table privileges. `authenticated` has SELECT on `app_audit`, `app_companies`, `app_demo_requests`, `app_email_outbox`, `app_handovers`, `app_imports`, `app_leads`, `app_members`, and `app_quotes`; SELECT/INSERT/DELETE on `app_costs`, `app_tasks`, and `app_time_entries`; SELECT/INSERT/UPDATE/DELETE on `app_integrations`, `app_invoices`, and `app_reminders`; SELECT/DELETE on `app_invites`; and SELECT/INSERT on `app_job_budgets` and `app_notes`. `app_rate_limits` and `app_requests` have no authenticated table privileges.
- Existing column-level UPDATE grants are restricted to the 19 listed company profile/form columns, `app_demo_requests.status`, `app_job_budgets.note/planned_cost/revenue/updated_at`, and `app_tasks.done`. They remain column-scoped; the candidate does not convert them into table-wide UPDATE grants. The demo-request grants remain under the existing platform-admin policies.
- The first live migration attempt stopped at the grant preflight and rolled back completely. The actual ACLs above showed why the original snapshot was insufficient; no hook, grants, policies, or data were committed by that attempt.
- The first corrected metadata query then exposed an empty-array edge case: `aclexplode(COALESCE(attacl, '{}'::aclitem[]))` rejects an empty ACL array. The capture query and migration preflight now expand only non-NULL `attacl` values. The corrected metadata-only capture completed successfully against the staging project at `2026-10-27T14:51:12.694007Z`, returning one metadata row with table and column ACLs; it read no customer rows and made no changes.
- The Auth access-token hook is not configured or enabled. Neither `app_private.jwt_tenant_id()` nor `public.app_tenant_access_token_hook(jsonb)` was present in the snapshot.
- Supabase Data API settings showed 0/22 tables and 0/33 functions exposed. Database grants and Data API exposure are separate controls; changing grants alone does not make these routes reachable from the application.

## Candidate and access map

`supabase/staging/20261027_stavbacore_jwt_tenant_reconcile.sql` is a staging-only candidate. It does not modify the production-derived numbered migration. The new restrictive boundary uses the trusted `app_metadata.tenant_id` and the existing live membership helper, so it is AND-ed with current owner/employee/assignment rules. The hook selects a tenant only when exactly one active owner/employee membership belongs to an active company; stale claims are cleared, and `user_metadata` is ignored.

The candidate preserves the existing table and column grant matrix and adds only the restrictive tenant boundary and Auth token hook:

| Scope | Grants | Existing policy still decides row access |
|---|---|---|
| Company, audit, outbox, handovers, imports, leads, members, notes, quotes | SELECT | Yes |
| Company profile columns | Existing column UPDATE only | Existing company owner policy |
| Costs | SELECT, INSERT, DELETE | Existing assignment/creator and owner checks |
| Integrations, invoices, reminders | SELECT, INSERT, UPDATE, DELETE | Existing owner or assignment checks |
| Tasks | SELECT, INSERT, DELETE plus UPDATE on `done` only | Existing owner or assignment checks |
| Invites | SELECT, DELETE | Owner only |
| Job budgets | SELECT, INSERT plus existing column UPDATE only | Owner only |
| Time entries | SELECT, INSERT, DELETE | Existing assignment/member checks |
| Demo requests | Existing SELECT and `status` column UPDATE | Platform-admin policy; no new grant |
| Rate limits, requests | None | Server-only or explicit direct-deny policy |

This candidate intentionally does not add table-wide UPDATE on companies, job budgets, tasks, or demo requests; invent lead insert/update policies; grant new RPC execution; or expose tables in the Data API. Those are separate application contracts. The current UI/API settings require selecting a least-privilege table allowlist after the SQL contract passes; broad auto-exposure of functions is not acceptable.

## Verification and rollout order

The dedicated `stavbacore-staging-jwt-reconcile` CI job builds a disposable PostgreSQL 17 fixture from this relation/policy inventory, applies the candidate, and verifies hook selection, ambiguous/missing membership denial, RLS isolation for two companies, forged-claim denial, broad-permissive-policy resistance, and the absence of anon/server-only grants. It uses only synthetic users and rows.

After CI passes, staging rollout order is:

1. Apply this candidate once to StavbaCore Staging after confirming the project ref in the dashboard.
2. Configure the Auth custom access-token hook to `public.app_tenant_access_token_hook`; leave it disabled until the hook tests pass, then enable it for new tokens.
3. Expose only the existing UI-required tenant tables in Data API settings; do not expose all functions or server-only tables.
4. Ensure the synthetic owner account has exactly one active membership in Tenant A and another synthetic owner has exactly one active membership in Tenant B. Use synthetic staging data only.
5. Refresh both sessions and verify that each can read only its own company and leads; verify a forged company ID / JWT claim is denied.
6. Continue the Playwright owner/employee acceptance and connector deployment only after these staging checks pass.

Do not use the legacy `scripts/staging-pilot-e2e.mjs`; it hardcodes the production ref. No production deployment, production query, live customer row, or production Auth configuration is part of this proposal.
