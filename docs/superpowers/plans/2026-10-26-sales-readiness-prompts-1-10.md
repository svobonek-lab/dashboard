# Sales Readiness Prompts 1–10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and verify all ten user-provided sales-readiness prompts in order against the current StavbaFlow repository.

**Architecture:** Preserve the existing FSD app, Supabase `app_*` schema contracts, serverless API boundaries, and CI conventions. Each prompt is a separate test-first task; database changes remain reviewable source migrations and are tested only in disposable CI/local databases.

**Tech Stack:** React, TypeScript, Vite, Supabase/PostgreSQL 17, Node test runner, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-26-sales-readiness-prompts-1-10.md` (derived from the user attachment `pasted-text-1.txt`).

## Global Constraints

- Never write to production or staging Supabase or apply a migration.
- Never commit credentials, password values, service-role keys, customer exports, or production data.
- Preserve public-form tenant binding, idempotency, RLS, and all existing release gates.
- Use `app_*` objects only where current repository contracts verify their names and signatures.
- Keep CI credentials GitHub-Secrets-only and make the E2E job opt-in.
- Keep changes within FSD dependency rules and avoid new dependencies unless a prompt requires them.

## Review Focus

- Anonymous callers spoofing the IP hash or bypassing the new intake limiter: cover server-derived hash and direct RPC grant boundary in Task 3.
- Owner/employee/platform-admin route crossover: cover role denials and route rendering in Tasks 1 and 8.
- A foreign-tenant identifier embedded in a cached/exported row: cover active company filtering and forbidden fields in Task 9.
- Missing legal/Sentry environment values in production: cover dev-only behavior in Task 4 and DSN gating in Task 10.
- Staging SQL drift or destructive migration assumptions: test clean ordered migrations in Task 6 and synthetic throttling in Task 3.

---

### Task 1: Separate owner, operator sales, and public demo

**Files:** `src/widgets/workspace-shell/ui/OwnerLayout.tsx`, `src/shared/lib/pilotScope.ts`, `src/app/App.tsx`, `src/pages/public/demo/ui/PublicDemoWorkspace.tsx`, admin route/UI if retaining the cockpit, `tests/public-demo-isolation.test.ts`, and a focused owner-navigation test.

**Interfaces:** Consume the existing `ProtectedRoute` and public-demo route dispatch. Produce an owner route allowlist with no `/sales`, an unauthenticated demo UI without `OwnerLayout`, and optionally `/admin/sales` protected as `platform_admin`.

- [x] Add regression tests proving owner nav/allowlist/routing omit `/sales` and the public demo does not mount `OwnerLayout`.
- [x] Run targeted tests and observe the expected failures.
- [x] Implement the route/layout changes, retaining cockpit only under platform-admin authorization if still useful.
- [x] Run targeted tests, `npm test`, `npm run lint`, and `npm run build`.
- [x] Commit Task 1.

### Task 2: Align landing claims with pilot scope

**Files:** `src/pages/public/landing/ui/LandingPage.tsx`, `docs/landing-claims.md`, landing claim tests.

**Interfaces:** Consume `PILOT_UNAVAILABLE_ROUTES` and existing pilot pricing/contact copy. Produce only claims supported by the live pilot and a changelog of all changed claims.

- [x] Add tests for unavailable-feature wording, illustrative calculator copy, and claims changelog coverage.
- [x] Run targeted tests and observe expected failures.
- [x] Edit unsupported claims without inventing metrics, users, references, or capabilities.
- [x] Run targeted tests, full `npm test`, lint, and build.
- [x] Commit Task 2. (A follow-up copy correction is included in PR #123.)

### Task 3: Secure public inquiry intake

**Files:** new timestamped migration in `supabase/migrations/`, `api/public-intake.ts` or the verified equivalent API boundary, `src/features/submit-inquiry/`, relevant RPC contract tests and disposable SQL setup/verify scripts.

**Interfaces:** Preserve the existing public tenant key and request idempotency contract. The server derives an HMAC IP hash from a trusted platform client-IP header using a dedicated configured secret; the database limiter keys by company and that hash. Raw IPs are never stored. Direct untrusted clients cannot supply or choose the hash.

- [x] Add API/SQL tests for 5 requests per 10 minutes, field maxima (120/30/254/4000), honeypot drop, duplicate idempotency, and direct anonymous RPC bypass denial.
- [x] Run targeted tests and observe expected failures.
- [x] Implement the proxy, migration, UI honeypot and bounded validation; default closed when the hash secret or trusted IP is missing.
- [x] Run target tests and the disposable PostgreSQL contract; do not apply to staging or production.
- [x] Commit Task 3.

### Task 4: Legal identity and release checklist

**Files:** `.env.example`, `src/pages/public/landing/ui/LandingPage.tsx`, legal link tests, `docs/go-live-checklist.md`.

**Interfaces:** Use existing company Vite variables. Missing ICO/address produces a visible warning only under `import.meta.env.DEV`; production render remains unchanged. Checklist items name an owner/verifier and concrete evidence.

- [x] Add tests for development-only warnings and working legal links.
- [x] Run targeted tests and observe expected failures.
- [x] Document every requested environment variable and release gate without changing legal copy substantively.
- [x] Run targeted tests, full test, lint, and build.
- [x] Commit Task 4.

### Task 5: Responsive platform-admin company directory

**Files:** `src/pages/admin/companies/ui/Companies.tsx`, `src/widgets/workspace-shell/ui/SuperAdminLayout.tsx`, admin UI tests and Playwright viewport check.

**Interfaces:** Desktop retains the existing table at 1280 px. At <=430 px render cards with name, slug, onboarding status, users, plan and a two-column action grid. Modal content scrolls within viewport.

- [x] Add responsive rendering and modal layout assertions.
- [x] Run targeted tests and observe expected failures.
- [x] Implement mobile cards, header truncation/hiding, and bounded scrollable dialog.
- [x] Verify at 375 px and 1280 px in Playwright; run full test, lint, and build.
- [x] Commit Task 5.

### Task 6: Staging-to-migration map and PostgreSQL 17 CI

**Files:** `docs/migration-map.md`, `.github/workflows/verify.yml`, migration test harness and SQL if needed.

**Interfaces:** Map every `supabase/staging/*_contract.sql` object to numbered migrations by object name/signature/policy. Preserve staging files; CI must fail if all numbered migrations cannot run in order on an empty PostgreSQL 17 database with the minimum Supabase roles/extensions bootstrapped.

- [x] Add a CI/harness test showing ordered migration execution on clean Postgres 17.
- [x] Run it and observe expected failure before the job/harness exists.
- [x] Add the workflow job and complete the table with coverage, partial coverage, and not-covered statuses.
- [x] Run SQL verification in disposable GitHub PostgreSQL 17 CI; local Docker/Postgres was unavailable.
- [x] Commit Task 6.

### Task 7: Remove unused website-analysis endpoint safely

**Files:** `api/analyze-website.ts`, dev route in `vite.config.ts`, `docs/archive/analyze-website.ts.txt`, endpoint security tests, package manifests only if proven safe.

**Interfaces:** Preserve `lib/gemini.ts` and `@google/genai` if incoming-lead still consumes them. No Vercel API discovery may build the archived `.txt` file.

- [x] Add a call-graph regression proving there is no app fetch/client and no dev route after archive.
- [x] Run targeted test and observe expected failure.
- [x] Archive only after proving no supported caller; remove unused server dependencies only after repository-wide checks.
- [x] Run root and connector test/lint/build.
- [x] Commit Task 7.

### Task 8: Opt-in staging Playwright main-flow smoke tests

**Files:** `tests/e2e/` (one test per scenario), `.github/workflows/verify.yml`, Playwright setup/readme if required.

**Interfaces:** `BASE_URL`, `OWNER_EMAIL`, `OWNER_PASSWORD`, `EMPLOYEE_EMAIL`, `EMPLOYEE_PASSWORD`, `OTHER_COMPANY_OWNER_EMAIL`, and `OTHER_COMPANY_OWNER_PASSWORD` are environment-only. Workflow runs only on `workflow_dispatch` or PR label `e2e`; tests use synthetic, uniquely named records and never print credentials.

- [x] Add five independent tests for owner menu, public idempotency, employee assignment scope, tenant REST isolation, and logout tenant-cache clearing.
- [x] Run against local mocked/fixture pages where possible; no tests target production. External staging run is blocked by missing fixture variables and acceptance contract.
- [x] Add the opt-in workflow job, scoped environment and secret bindings.
- [x] Run static tests, Playwright local/fixture tests, full root suite, lint, and build.
- [x] Commit Task 8.

### Task 9: Dependency audit, logout cache cleanup, and data export

**Files:** root/connector package manifests and lockfiles if justified, `src/shared/lib/tenantCache.ts`, `src/app/providers/OrganizationProvider.tsx`, `src/pages/owner/settings/`, export model/API tests.

**Interfaces:** Logout removes all `TENANT_CACHE_NAMES` for active company plus keys with the tenant-cache prefix. Export uses only the signed-in client's RLS-protected queries and the active company; it excludes internal IDs, password/credential/token/hash fields and never uses service role.

- [x] Add failing tests for full-prefix logout removal and safe export columns/tenant filters.
- [x] Run focused tests and observe expected failures.
- [x] Audit dependencies across src/api/lib/shared/connector before removal; implement cleanup and an honest export including verifiable lead, employee and change-history sources.
- [x] Run full root and connector tests, lint, build, and verify the export fixture contains no forbidden fields.
- [x] Commit Task 9 (`72c6983`).

### Task 10: Monitoring and incident runbook

**Files:** `src/shared/lib/sentry.ts`, `.env.example`, `docs/runbook-incident.md`, `api/outbox-scheduler.ts`, and migration/contract tests only if no durable run-result record already exists.

**Interfaces:** Sentry initializes only with configured DSN; user context contains no email or display name and organization tags use internal ID and role only. Outbox run results expose safe status/count/time/error-code data and contain no customer content or secrets.

- [x] Add tests for DSN gating, PII-free scope and durable outbox run evidence.
- [x] Run targeted tests and observe expected failures.
- [x] Implement the minimal monitoring/runbook changes; add SQL only when repository evidence proves no existing durable result table/RPC.
- [x] Run full root and connector tests, lint, build and disposable SQL tests. GitHub CI job passed; local PostgreSQL execution is blocked because Docker is not running.
- [x] Commit Task 10.

### Final audit

- [x] Review every prompt against files and runtime evidence, including the carried-over connector-card change from the prior active goal.
- [x] Run a full final test/lint/build pass and `git diff --check` (root: 408/408; lint/build passed on 27 Oct 2026).
- [x] Complete a fresh whole-branch review, fix the unsupported pilot-acceptance marketing claim through regression tests, and keep the reviewable PR #123 draft/unmerged. Current exact-head GitHub checks remain to be observed after the latest push.
