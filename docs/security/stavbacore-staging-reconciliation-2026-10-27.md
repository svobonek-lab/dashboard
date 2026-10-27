# StavbaCore Staging JWT reconciliation

Status: reviewed candidate; no live SQL was applied by this change.

## Snapshot and mismatch

- Source: metadata-only GitHub Actions run [40509027192](https://github.com/svobonek-lab/dashboard/actions/runs/40509027192), database capture at `2026-10-27T13:05:42.921293Z`.
- Target: StavbaCore Staging, project ref `xwzweltjvreqhjpbjrxa`. Production ref is `oncmtmrhmjlerbwkrecv`; it is a different project and must remain read-only.
- Snapshot includes 20 `public.app_*` tables, 202 columns, 36 policies, 32 functions, 2 triggers, and no table or column grants returned by the metadata query. RLS is enabled on all 20 tables and FORCE RLS is not enabled on any.
- The `app_*` set is `app_audit`, `app_companies`, `app_costs`, `app_demo_requests`, `app_email_outbox`, `app_handovers`, `app_imports`, `app_integrations`, `app_invites`, `app_invoices`, `app_job_budgets`, `app_leads`, `app_members`, `app_notes`, `app_quotes`, `app_rate_limits`, `app_reminders`, `app_requests`, `app_tasks`, `app_time_entries`.
- Tenant source columns are `app_companies.id`, and `company_id` on every other company-owned table. `app_demo_requests` is platform-admin scoped; `app_rate_limits` has no company key and a direct-deny policy; `app_requests` has a company key but a direct-deny policy. Those three get no browser grants.
- Existing RLS helpers are `public.app_role(uuid) RETURNS text` and `public.app_can_lead(uuid,uuid) RETURNS boolean`; both are SECURITY DEFINER with `search_path=public, pg_temp`. Policies call these public helpers, not `app_private.app_role`.
- Existing policy names, commands, and authenticated roles are checked by the candidate against all 36 rendered policies. The candidate fails closed on relation, tenant-column, helper, RLS, policy, or baseline grant drift.
- The Auth access-token hook is not configured or enabled. Neither `app_private.jwt_tenant_id()` nor `public.app_tenant_access_token_hook(jsonb)` was present in the snapshot.
- Supabase Data API settings showed 0/22 tables and 0/33 functions exposed. Database grants and Data API exposure are separate controls; changing grants alone does not make these routes reachable from the application.

## Candidate and access map

`supabase/staging/20261027_stavbacore_jwt_tenant_reconcile.sql` is a staging-only candidate. It does not modify the production-derived numbered migration. The new restrictive boundary uses the trusted `app_metadata.tenant_id` and the existing live membership helper, so it is AND-ed with current owner/employee/assignment rules. The hook selects a tenant only when exactly one active owner/employee membership belongs to an active company; stale claims are cleared, and `user_metadata` is ignored.

Authenticated grants are added only where the existing staging policy has a matching operation:

| Scope | Grants | Existing policy still decides row access |
|---|---|---|
| Company, audit, outbox, handovers, imports, leads, members, notes, quotes | SELECT | Yes |
| Company | UPDATE | Owner only |
| Costs | SELECT, INSERT, DELETE | Existing assignment/creator and owner checks |
| Integrations, invoices, reminders, tasks | SELECT, INSERT, UPDATE, DELETE | Existing owner or assignment checks |
| Invites | SELECT, DELETE | Owner only |
| Job budgets | SELECT, INSERT, UPDATE | Owner only |
| Time entries | SELECT, INSERT, DELETE | Existing assignment/member checks |
| Demo requests, rate limits, requests | None | Platform or explicit direct-deny policy |

This candidate intentionally does not invent lead insert/update policies, grant new RPC execution, or expose tables in the Data API. Those are separate application contracts. The current UI/API settings require selecting a least-privilege table allowlist after the SQL contract passes; broad auto-exposure of functions is not acceptable.

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
