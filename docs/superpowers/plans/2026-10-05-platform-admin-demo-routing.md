# Platform Admin and Demo Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email-based browser elevation with a server-verified platform administrator boundary and route every public demo action to the configured real dashboard demo.

**Architecture:** Add a review-only staging SQL contract for UUID-based platform administrators, audited read-only support sessions, and a narrow self-role RPC. Vercel platform APIs authenticate bearer sessions and re-check the registry server-side. The React app resolves the platform identity before tenant membership, exposes only truthful read-only control-plane data, and uses one validated demo URL helper.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vercel Functions, Supabase Auth/Postgres/RLS, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-05-platform-admin-demo-routing-design.md`

## Global Constraints

- Production Supabase is read-only; SQL is a reviewed staging artifact and is never auto-applied.
- Platform administrators never gain direct customer-row access through tenant RLS.
- Runtime authorization uses the verified Auth UUID, never an email comparison.
- Service-role credentials stay in server-only modules and never enter `VITE_*` variables or logs.
- Support access is explicit, read-only, limited to one company, expires within 30 minutes, and is audited.
- Public deployment demo targets require HTTPS; local HTTP is limited to local development.
- No automatic merge, database migration, or production deployment.

## Review Focus

- Missing or malformed bearer tokens must return `401` without leaking token details; Task 2 tests this boundary.
- Inactive and unknown administrator UUIDs must return `403`; Task 2 tests both cases.
- Platform role must not imply tenant owner permissions; Tasks 3 and 4 test route and navigation isolation.
- Unsafe or incorrectly configured demo URLs must not become navigation targets; Task 5 tests protocols, credentials, and malformed values.
- Audit failure must prevent support-session creation; Tasks 1 and 2 pin the transactional database/API contract.

---

### Task 1: Review-only staging platform contract

**Files:**
- Create: `supabase/staging/20261005_platform_admin_contract.sql`
- Create: `tests/platform-admin-staging-contract.test.ts`

**Interfaces:**
- Produces: `app_platform_admins`, `app_platform_support_sessions`, `app_platform_audit_events`, and `app_get_my_platform_role()`.
- Consumes: existing `app_companies` and `auth.users` staging identities.

- [ ] **Step 1: Write contract tests that require RLS, revoked public grants, fixed function search paths, authenticated self-role execution only, read-only support sessions, and no tenant-policy bypass.**
- [ ] **Step 2: Run `npm test -- tests/platform-admin-staging-contract.test.ts` and confirm failure because the SQL file does not exist.**
- [ ] **Step 3: Add idempotent staging SQL with schema-qualified references, UUID keys, 30-minute support expiry, immutable audit rows, transactional support-session audit, and no policy on tenant data.**
- [ ] **Step 4: Run the focused test and the complete `npm test`; both must pass.**
- [ ] **Step 5: Commit only the SQL artifact and its tests.**

### Task 2: Server-side platform authorization and allowlisted API

**Files:**
- Create: `api/_platform/http.ts`
- Create: `api/_platform/supabaseAdmin.ts`
- Create: `api/_platform/auth.ts`
- Create: `api/_platform/handler.ts`
- Create: `api/_platform/routes/companies.ts`
- Create: `api/_platform/routes/session.ts`
- Create: `api/platform/[route].ts`
- Create: `tests/platform-admin-api.test.ts`
- Modify: `vercel.json`

**Interfaces:**
- Produces: `authenticatePlatformRequest(request)`, `resolvePlatformRoute(value)`, `GET /api/platform/session`, and `GET /api/platform/companies`.
- Consumes: server-only Supabase URL/service role and authenticated bearer token.

- [ ] **Step 1: Write failing tests for route allowlisting, methods, body limits, missing/malformed bearer tokens, invalid Auth sessions, inactive admins, and minimal company response fields.**
- [ ] **Step 2: Run the focused API tests and confirm failures are caused by missing modules.**
- [ ] **Step 3: Implement safe error mapping, server client creation, bearer-session verification, active-registry lookup, and allowlisted routing.**
- [ ] **Step 4: Implement session and company-directory handlers; select only `id,name,slug,active,onboarding_completed,created_at` plus bounded operational counts available from server-side aggregate RPCs. Never select leads or contacts.**
- [ ] **Step 5: Run focused and full tests; commit the server boundary.**

### Task 3: Unified platform identity resolution

**Files:**
- Create: `src/app/platformIdentity.ts`
- Create: `tests/platform-identity.test.ts`
- Modify: `src/app/permissions.ts`
- Modify: `src/app/authWorkspaceUser.ts`
- Modify: `context/OrganizationContext.tsx`
- Modify: `src/app/ProtectedRoute.tsx`
- Modify: `components/CompanySwitcher.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/production-legacy-boundary.test.ts`

**Interfaces:**
- Produces: `PlatformIdentity`, `readPlatformIdentity(client)`, and role `platform_admin`.
- Consumes: `app_get_my_platform_role()` and existing app-members identity resolution.

- [ ] **Step 1: Write failing tests proving platform identity wins before membership, inactive role falls through to tenant identity, no identity fails closed, and no runtime email authorization remains.**
- [ ] **Step 2: Run the focused tests and confirm the expected failures.**
- [ ] **Step 3: Add the role resolver and update permissions so platform admin can access `/admin` only and receives no owner/employee tenant privileges.**
- [ ] **Step 4: Update session initialization and login to resolve platform identity before membership; remove `switchRoleToSuperAdmin`, email elevation, platform impersonation, and platform access to owner/employee routes.**
- [ ] **Step 5: Run focused and full tests; commit identity changes.**

### Task 4: Truthful platform control plane

**Files:**
- Create: `src/app/platformClient.ts`
- Create: `src/pages/admin/Unavailable.tsx`
- Create: `tests/platform-admin-ui.test.ts`
- Modify: `src/layouts/SuperAdminLayout.tsx`
- Modify: `src/pages/admin/Dashboard.tsx`
- Modify: `src/pages/admin/Companies.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: authenticated `getPlatformSession()` and `listPlatformCompanies()` client calls.
- Consumes: Task 2 platform API and Task 3 `platform_admin` route.

- [ ] **Step 1: Write failing source/behavior tests proving fabricated MRR, telemetry, billing, domains, and tenant impersonation are absent from reachable admin navigation.**
- [ ] **Step 2: Run focused tests and confirm they fail against current UI.**
- [ ] **Step 3: Replace the dashboard with onboarding/integration-health truth states and load the minimal company directory through the platform API.**
- [ ] **Step 4: Remove unsupported admin routes from navigation, replace direct workspace opening with an unavailable/read-only support explanation, and brand the layout as StavbaFlow.**
- [ ] **Step 5: Run focused and full tests; commit the truthful control plane.**

### Task 5: Validated cross-deployment demo navigation

**Files:**
- Create: `src/app/demoUrl.ts`
- Create: `tests/demo-url.test.ts`
- Modify: `features/LandingPage.tsx`
- Modify: `features/publicDemo/PublicDemoWorkspace.tsx`
- Modify: `src/layouts/SuperAdminLayout.tsx`
- Modify: `.env.example`
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Produces: `resolveDemoUrl(env, runtime)` returning a safe URL or a configuration error.
- Consumes: `VITE_DEMO_URL`, `VITE_APP_URL`, deployment mode, and current origin.

- [ ] **Step 1: Write failing tests for explicit HTTPS URL, app URL fallback, local fallback, malformed URLs, credentials, protocol-relative values, queries/fragments, and unsafe schemes.**
- [ ] **Step 2: Run focused tests and confirm failures.**
- [ ] **Step 3: Implement URL normalization and rejection; add a small navigation helper that refuses invalid targets.**
- [ ] **Step 4: Replace all relative demo actions, update the demo footer and admin demo action, and document the public environment variable.**
- [ ] **Step 5: Run focused and full tests; commit demo routing.**

### Task 6: Provisioning, documentation, and full verification

**Files:**
- Create: `scripts/provision-platform-admin.mjs`
- Create: `tests/platform-admin-provisioner.test.ts`
- Create: `docs/platform-admin-runbook.md`
- Modify: `package.json`
- Modify: `WORKPLAN.md`

**Interfaces:**
- Produces: `npm run provision:platform-admin -- --email <email>` dry run and explicit `--apply` staging path.
- Consumes: reviewed Task 1 contract, staging project allowlist, and server-only staging service role.

- [ ] **Step 1: Write failing tests for dry-run default, exact-one-user resolution, production-reference rejection, masked output, explicit apply, and absence of password mutation.**
- [ ] **Step 2: Run focused tests and confirm failures.**
- [ ] **Step 3: Implement the staging-only provisioner and operator runbook without executing it.**
- [ ] **Step 4: Update the work plan with remaining manual staging evidence and production release gates.**
- [ ] **Step 5: Run `npm ci`, `npm test`, `npm run lint`, `npm run build`, `npm audit`, staged-diff secret scan, and browser verification of landing/demo/login/admin denial paths.**
- [ ] **Step 6: Perform one whole-branch review, fix Critical/Important findings with RED→GREEN evidence, commit, push, and open a draft PR stacked on `feature/connector-release-pilot`.**
