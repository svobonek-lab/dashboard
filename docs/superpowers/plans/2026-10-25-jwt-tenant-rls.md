# JWT Tenant Isolation and RLS Hardening Implementation Plan

> Approved inline plan. A current project-scoped, read-only snapshot replaced the former pre-snapshot table assumptions; see the recorded rulings in docs/superpowers/ledgers/2026-10-25-jwt-tenant-rls.md.

**Goal:** Produce a reviewable app-schema Auth hook / RLS reconciliation proposal and synthetic pgTAP coverage. No production or staging application.

**Base:** origin/main 2e8e583ee70871b23b8bc79ba5ae456427c09144
**Branch:** codex/jwt-tenant-rls-hardening
**Spec:** docs/superpowers/specs/2026-10-25-jwt-tenant-rls-design.md

## Constraints

- Use app_* and trusted app_metadata.tenant_id; row key company_id; root app_companies.id.
- Preserve hard deletes and all narrower live policy behavior.
- Production metadata only through project-scoped supabase-ci MCP with read_only=true. No customer rows, secrets, RPC execution, DDL, migrations, or alternative clients.
- Never apply this proposal to Supabase. CI uses synthetic PostgreSQL 17 only.
- Reconcile the exact live set against docs/security/app-rls-table-matrix.md. Preflight fails on unknown/missing app_* relations, required columns/helpers, or incompatible policy/grant state.
- Keep service-only, public intake, platform, and direct tenant access separate. Do not grant service_role as an RLS tenant mechanism.
- Do not alter the six named production SECURITY DEFINER functions with non-empty search_path: exact production definitions were not preserved in the snapshot. Record them as rollout blockers unless verified source and tests justify a change.
- Use a dedicated codex/ branch and draft PR only. No push/merge to main or auto-merge.

## Task 1 — Lock current metadata matrix

Files: update the spec; create docs/security/app-rls-table-matrix.md.

- [x] Record project ref, true capture windows, query source, schema, columns, RLS/forced flags, rendered policies/grants, FKs, and function facts.
- [x] Record exact 19 names returned by pg_catalog; note the generated summary’s inconsistent “20” and fail closed if an additional relation is found.
- [x] Classify the seven authenticated tenant tables, two explicit direct-deny tables, three forced platform tables, and other service-only tables from verified ACL/policy evidence.
- [x] Reconcile every permission/policy used by the proposal against rendered evidence; clearly flag the snapshot omissions (46 claimed policies/27 rendered; 36 claimed definers/35 rendered).

## Task 2 — Add synthetic pgTAP test contracts and runner

Files: preserve supabase/tests/jwt_tenant_setup.sql; add supabase/tests/jwt_tenant_pgtap_setup.sql, jwt_tenant_boundary_red.pgtap.sql, jwt_tenant_auth_hook.pgtap.sql, and jwt_tenant_rls.pgtap.sql; add supabase/tests/Dockerfile.jwt-pgtap; add a dedicated job to .github/workflows/verify.yml.

- [x] Seed only synthetic Tenant A/B, users, memberships, leads and minimal schema for all matrix tables.
- [x] Add hook tests for owner/employee, inactive/ambiguous membership, malformed input, forged user_metadata, stale claim clearing, and grants.
- [x] Add direct-table tests: same-tenant allow, cross-tenant deny, missing/forged claim denial, hard-delete, broad permissive policy bypass, direct deny for anon/auth, and service-role grants.
- [x] Configure CI to run a pgTAP RED preflight, apply only on disposable postgres:17-bookworm, then verify the GREEN suites.
- [ ] Build disposable postgres:17-bookworm with pgTAP and verify CREATE EXTENSION pgtap in CI.

## Task 3 — Reconcile Auth hook and safe tenant parser

File: create supabase/migrations/20261025000000_secure_jwt_auth_hook.sql.

- [x] Create strict app_private.jwt_tenant_id() with SECURITY INVOKER and empty search_path; invalid/absent claims return NULL.
- [x] CREATE OR REPLACE public.app_tenant_access_token_hook(jsonb) as SECURITY DEFINER, fixed empty search_path, qualified relations, UUID input validation, active membership + company, and exactly-one-membership semantics.
- [x] Set and clear both app_metadata.tenant_id and app_metadata.tenant_role. Never read user_metadata.
- [x] Revoke hook execute from PUBLIC/anon/authenticated/service_role; grant only supabase_auth_admin. Restrict parser grants to verified policy roles.
- [x] Preserve the existing Auth Dashboard setting as a human rollout gate; do not change it.

## Task 4 — Fail-closed RLS reconciliation

File: same migration; tests: every matrix test file.

- [x] Add transaction preflight comparing the complete public app_* relation set (relkind r or p) to the 19 exact names. Raise with the mismatch before any change.
- [x] Require the verified helper signatures, tenant keys, expected RLS enabled/forced flags, grants, and the existing narrow policies before changing anything.
- [x] For app_companies and the six verified tenant child tables, install/reconcile restrictive authenticated tenant boundaries only; preserve owner, employee assignment, creator, and hard-delete policies.
- [x] For app_imports and app_public_intake_events, retain explicit anon/auth direct-deny. For service-only/platform tables, do not create tenant access or broaden grants.
- [x] Assert no anonymous direct table grants, retain legal acceptance append-only privileges, and leave app_stripe_webhook_events without a direct app-role grant.
- [x] No deleted_at references. No changes to the six unverified non-empty-path SECURITY DEFINER functions.
- [ ] Run table and hook tests before/after the proposal against the synthetic fixture only.

## Task 5 — Function audit and operator runbook

Files: docs/security/app-rls-table-matrix.md; docs/jwt-tenant-boundary-runbook.md; tests as needed.

- [x] Document hook/helper signatures, owners, grants, paths and current evidence limitations.
- [x] Do not claim exhaustive function inventory: snapshot summary omitted one definer name. Do not modify function bodies/paths without exact production source evidence.
- [x] Label the migration as a proposal, list preflight blockers, tested matrix, and separate human rollout review gates.

## Task 6 — Verify and open draft PR

- [ ] Run the disposable PostgreSQL 17/pgTAP workflow path with ON_ERROR_STOP.
- [x] Run npm ci, npm test, npm run lint, and npm run build.
- [ ] Run git diff --check; review the full diff and scan changed files for secrets/customer-row exports.
- [ ] Push only codex/jwt-tenant-rls-hardening and open a draft PR against main. State no staging/production SQL was applied and auto-merge is disabled.
- [ ] Attach the PR to this Codex task and report verification evidence.

## Plan adjustment / ruling

Ruling: The fresh snapshot proves the hook and several tenant boundaries already exist. The implementation is a proposal to reconcile and test those contracts, not a first deployment. The generated output’s table/policy/function totals are internally inconsistent, so exact relation preflight and explicit blocker documentation are required; never silently treat the reported totals as complete.

Ruling: Keep one shared pgTAP suite for the verified app_* matrix instead of 19 nearly empty per-table files — common catalog/grant assertions plus explicit coverage of the seven direct-access tables provide the required contract with less duplicated setup; cost if wrong: failures are less localized to a single table.
