# JWT Tenant Isolation and RLS Hardening

**Status:** Approved proposal in progress; production is read-only and remains untouched.
**Date:** 2026-10-25

## Intent

Harden and make reviewable the existing StavbaFlow tenant authorization contract. Authenticated tenant access must be bound to an active company membership, and restrictive RLS boundaries must compose with owner, assignment, and creator permissions.

This work uses the verified app_* model. It does not recreate legacy organization_members objects or assume historical migrations match the deployed database.

## Verified current state

- Supabase project: StavbaFlow, ref oncmtmrhmjlerbwkrecv. Repo MCP URL is pinned to that ref with read_only=true.
- GitHub Actions run 40177557615 queried current schema/policy/function metadata through project-scoped supabase-ci at 2026-10-25 08:41–08:42 UTC. Run 40178044476 returned role privileges and database time 08:50:08.775666 UTC. No customer/application rows were selected.
- Catalog output contains 19 exact public app_* base-table names. A generated summary labels the list as 20, but only 19 names and ACL rows are rendered. The proposal records those 19; migration preflight must include partitioned relations and fail if the actual set differs, so an omitted extra table cannot be changed silently. A follow-up count attempt was denied by the OpenCode free-model daily limit.
- All 19 rendered app_* tables have RLS enabled; app_platform_admins, app_platform_audit_events, and app_platform_support_sessions have FORCE RLS. Seven tables grant direct authenticated access; anon has no direct privileges on the listed tables. Service-role access remains an independent server path.
- Live metadata already shows public.app_tenant_access_token_hook(jsonb) and restrictive app_jwt_tenant_boundary policies on seven tenant-facing tables. Do not treat the hook or boundaries as absent, and do not replace narrower policies with broad tenant access.
- Generated policy/function summaries are incomplete: 46 policies are claimed but only 27 policy rows are rendered; 36 SECURITY DEFINER functions are claimed but only 35 names are rendered. The matrix marks unrendered details as unresolved. Exact output evidence is recorded in docs/security/app-rls-table-matrix.md.
- The hook's production definition and Auth Dashboard configuration were not independently verified. The current staging function is source evidence only.
- The existing proposal contract and fixtures are in supabase/staging/20261024_jwt_tenant_boundary.sql and supabase/tests/jwt_tenant_setup.sql / jwt_tenant_verify.sql. Existing CI tests synthetic data in disposable PostgreSQL 17.
- app_* columns do not include deleted_at. Preserve physical hard-delete semantics; do not invent soft-delete columns or predicates.

## Goals

1. Add a reviewable migration proposal under supabase/migrations that reconciles the already-present Auth hook and verified tenant boundaries, with strict metadata preflight that fails on any unclassified app_* relation or contract mismatch.
2. Derive app_metadata.tenant_id and descriptive app_metadata.tenant_role only from exactly one active app_members row joined to an active app_companies row. Ignore user_metadata and clear stale claims for missing, invalid, inactive, or ambiguous membership.
3. Keep authorization based on live app_private.app_role and app_private.app_can_lead, not a potentially stale tenant_role claim.
4. Preserve exact live owner, employee-assignment, creator, public intake, service-only, and platform-support boundaries from the reviewed matrix.
5. Add synthetic pgTAP coverage for hook claims/grants, every verified tenant-facing table, direct-deny tables, and service-only grant boundaries. Do not claim tenant isolation for service_role.
6. Run database checks only against a disposable PostgreSQL 17 fixture. Do not configure Auth, deploy functions, or apply SQL to staging or production.

## Decisions

- Trusted tenant claim remains app_metadata.tenant_id; row key is company_id, and company root is app_companies.id. tenant_role is informational only.
- Keep hard deletes unchanged. Select predicates will not mention nonexistent deleted_at columns.
- Use restrictive boundaries only where direct authenticated access is proven by grants and current policies. app_companies uses id; verified tenant child tables use company_id.
- For service-only/public intake tables, test their actual direct grants and RPC separation. Do not add authenticated grants or claim service_role is RLS-protected.
- Do not grant platform administrators or support sessions tenant-wide access.
- The proposal is a draft migration only. No production or staging writes, Auth setting changes, session refreshes, or auto-merge.

## Verified unresolved items

- The generated table summary says 20, while catalog output lists 19. The migration must compare the complete public app_* relation set (including relkind p) with the exact matrix list and abort before changes on mismatch.
- The generated summary says 46 policies but renders 27. Current predicates are verified only for the listed policy rows. Migration preflight must validate the seven boundary policies and direct-deny rules it relies on; it must not rewrite other policies.
- The generated function report says 36 SECURITY DEFINER functions but renders 35. Six named functions use search_path public, pg_temp. Do not change their bodies or path without exact production source and disposable tests; record them as rollout review blockers.
- The current live hook body and Auth Dashboard hook target remain unverified. The proposal may define a fixed-path replacement in source, but rollout requires human comparison with the live definition and Auth configuration.
- The `app_stripe_webhook_events` table has no direct app-role grants; a separately granted SECURITY DEFINER webhook routine is its server path. Do not grant service_role direct table access.

## Test and CI design

- Extend the synthetic PostgreSQL 17 fixture; never attach production credentials to CI.
- Test active owner and employee claims, missing/inactive/ambiguous membership, malformed event UUID, forged user_metadata, and stale claim removal.
- Assert hook EXECUTE is denied to PUBLIC, anon, authenticated, and service_role and allowed to supabase_auth_admin.
- For each tenant-facing table, test same-tenant access, cross-tenant denial, missing/forged tenant claim, inactive membership, assignment/creator constraints, wrong-company writes, and a broad permissive policy that cannot bypass the restrictive boundary.
- For direct-deny/service-only tables, test anon/authenticated grants and policies remain deny; test legal acceptance append-only grants and the absence of direct app-role access to Stripe webhook events.
- Keep public intake, platform support, Storage, and service-role paths separate from direct tenant RLS.

## Non-goals

- Applying migrations to production or staging, configuring the production Auth hook, refreshing customer sessions, deploying functions, or changing customer data.
- Changing hard deletes to soft deletes or adding deleted_at.
- Migrating legacy organizations/users/employees/organization_members data.
- Changing unrelated billing, connector, platform-admin, public intake, or customer-facing behavior.
- Claiming deployment safety based only on RLS being enabled or a local test passing.

## Acceptance criteria

1. The matrix documents every exact catalog-returned RLS app_* relation and grants/policies used by the proposal; any mismatch fails closed.
2. Hook claims come only from live active membership; user_metadata never authorizes access.
3. Restrictive tenant boundaries compose with verified narrower operation policies; mutation checks remain explicit.
4. pgTAP proves tenant A/B isolation and direct-deny/service-only boundaries using synthetic rows only.
5. Disposable PostgreSQL 17 CI runs the proposal and tests without production credentials.
6. npm ci, npm test, npm run lint, and npm run build pass.
7. A draft PR is opened for human review; no staging/production SQL is applied and auto-merge stays disabled.
