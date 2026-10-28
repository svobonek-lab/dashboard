# Staging Acceptance Prompts 1–8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the eight user-specified staging acceptance prompts with reproducible evidence, honest release gates, and no production writes.

**Architecture:** Preserve the existing StavbaFlow application, Supabase `app_*` contracts, Playwright setup, Stripe test-mode integration, and connector. Separate local/disposable proof from live staging acceptance; do not treat SQL source or unit tests as evidence of deployed state.

**Tech Stack:** TypeScript, Node 24, Playwright, Supabase PostgREST/Auth/Storage, disposable PostgreSQL in Docker, k6, Sentry, Stripe TEST mode, GitHub Actions.

**Spec:** User-provided `goal-objective.md` at `C:\Users\svobo\.codex\attachments\fa44a7cb-f5ca-4d21-bdb5-430322d6dc89\goal-objective.md`.

## Global Constraints

- Never write to production Supabase or use production data as a test fixture.
- Use only synthetic records and isolated staging or disposable local databases.
- Do not apply the notes/files migration from prompt 3; leave it reviewable only.
- Do not weaken the existing public intake rate limit to make a test pass; record actual thresholds and outcomes.
- Do not claim staging, Sentry, Stripe, or load acceptance without current runtime evidence.
- Keep the current app and brand; this work extends StavbaFlow and creates no separate product.
- Keep service-role keys, passwords, tokens, PII and customer credentials out of output, repository files and browser bundles.
- Work on a dedicated branch, run applicable local checks, and open a reviewable PR without merging it.

## Review Focus

- A seed target resolving to production despite a staging label — guard URL hostname, HTTPS, and distinct project refs before creating the client.
- Cross-tenant writes appearing successful while silently targeting zero rows — assert both HTTP response and an independent tenant-B readback.
- RLS/storage coverage missing a table, policy, RPC or bucket — derive the matrix from current schema metadata and migrations, not guesses.
- Concurrent public submissions bypassing limits or idempotency — exercise parallel calls against disposable PostgreSQL and assert exact lead counts.
- Load tests corrupting data or hiding errors — use synthetic fixtures, explicit dry-run endpoints, bounded VUs, thresholds and cleanup.
- Monitoring attaching personal data — assert only internal `company_id` and approved `role` tags and inspect the actual synthetic Sentry event.
- Release claims reaching production before acceptance — verify built copy and deployed public pages independently.
- Stripe live-mode leakage or incorrect access timing — fail closed unless Preview is explicitly TEST mode and use only Stripe test fixtures.

---

### Task 1: Staging seed and owner login

**Files:**
- Review: `scripts/seed-two-tenants.ts`
- Review: `tests/seed-two-tenants.test.ts`
- Review/update: `docs/staging-two-tenant-seed.md`
- Update: `tests/e2e/support.ts`
- Update: `tests/e2e/tenant-rest-isolation.spec.ts`

- [ ] Confirm the `NO_ACTIVE_MEMBERSHIP` lookup and exact `app_members` contract against current repository migrations and metadata-only staging snapshot.
- [x] Make seed dry-run perform zero reads/writes beyond target validation; retain guard coverage for production and malformed URLs and add a regression test proving it returns before credentials/client setup.
- [ ] Add explicit, value-free output for the four user IDs and two company IDs only after `--apply` succeeds.
- [x] Add idempotent synthetic lead/note/invitation/audit fixtures; add opt-in file fixtures gated on the review-only notes/files migration. File uploads are rolled back if metadata insert fails.
- [x] Run unit tests and dry-run locally; do not run `--apply` without staging-only credentials and verify their project ref first. `npm test` passed 424/424; `npm run lint` and `npm run build` passed; local dry-run validated the configured staging ref and reported no writes.
- [ ] If credentials are unavailable, record the exact missing secret names and leave live membership acceptance blocked.

### Task 2: Tenant REST, Storage and endpoint isolation

**Files:**
- Update: `tests/e2e/tenant-rest-isolation.spec.ts`
- Update: `tests/e2e/support.ts`
- Add/update: fixture IDs in `docs/staging-two-tenant-seed.md`
- Add/update: `docs/combined-tenant-release-acceptance.md`

- [x] Derive the current `app_*` table matrix from the available metadata snapshot and include `app_lead_files` when its documented migration-backed fixture is enabled. Current snapshot still lacks file table and Storage metadata, so the live complete schema matrix remains blocked.
- [x] For owner A and employee A, assert no company-B rows are visible and INSERT/UPDATE/DELETE are rejected or demonstrably affect zero rows for leads, notes, file metadata, members, invitations, company profile and audit controls.
- [x] Add employee-A read/status-change attempt against the seeded company-B lead assigned to employee B, including independent owner-B readback; Playwright discovers the test, but live staging execution remains blocked by missing fixture configuration.
- [x] Add current-schema cross-tenant SELECT checks for leads, notes, members, invitations, company profile and audit rows; add company-B marker checks to the owner CSV export and public-intake response. Playwright discovery passes; these are prepared assertions, not live isolation evidence.
- [x] Add a same-value company-profile UPDATE probe as owner A and independently confirm the company-B profile is unchanged as owner B; live staging result is pending.
- [x] Cover leads, notes, file metadata and private Storage object paths, employees, invitations, company profile, export, audit history and public intake response in fail-closed staging E2E specs. Live run awaits migration-backed fixtures and credentials.
- [x] Prove employee A cannot change a lead assigned to employee B; independently read the lead as owner B after the attempt.
- [x] Emit a machine-readable table of resource × operation × status as Playwright annotations and test output; fail if any B fixture is visible or mutated by A.
- [ ] Run against isolated staging only after synthetic fixtures exist; keep the suite blocked rather than substituting mocks for live RLS proof.

### Task 3: Schema reconciliation and review-only notes/files migration

**Files:**
- Add/update: `docs/schema-contract-matrix.md`
- Add: a metadata-only current staging schema snapshot under `supabase/schema-snapshots/`
- Add: review-only migration for `app_lead_notes`, `app_lead_files`, RLS and private Storage policies
- Update: `src/features/lead-notes-files/` feature gate and honest unavailable state
- Update: `.github/workflows/verify.yml` schema drift check

- [ ] Compare every `app_*` relation, column, constraint, policy, grant, function signature and storage policy in current metadata with both migration trees.
- [ ] Record every difference and its source; do not infer production schema from local migrations.
- [x] Keep the notes/files SQL review-only and verify it against disposable PostgreSQL 17. Rerun on 2026-10-28 applied the proposal only to a temporary local container; contract verification passed for note/file RLS, company-bound Storage paths, audit and employee field allowlist. Container was removed; staging remains unchanged.
- [x] Hide note/attachment actions when the capability flag is off and show “Přílohy budou brzy k dispozici”; the capability only enables for the declared staging project, and tests assert disabled state performs no reads.
- [x] Add a CI gate comparing readable staging migration history to repository migrations, requiring complete schema/RLS/function/Storage metadata, and checking every migration-declared table, column, policy and function name is present. It deliberately fails on the current stale snapshot. The verifier checks object presence, not policy expressions, grants, or full function signatures; these still need the complete snapshot and reviewed diff.
- [ ] Confirm no migration command is wired to deployment or production.

### Task 4: Public intake abuse and retry acceptance

**Files:**
- Review/update: `supabase/migrations/20261026000000_public_intake_rate_limit.sql`
- Update: `supabase/tests/public_intake_security_verify.sql`
- Update: `tests/public-intake-api.test.ts`
- Update/add: public-intake Playwright or HTTP acceptance test
- Update: `docs/staging-contract-runbook.md`

- [x] Extend disposable PostgreSQL acceptance to issue 50 same-IP requests within 10 seconds and assert the configured limit returns rate-limit errors without exceeding the accepted lead count; fresh PostgreSQL 17 rerun on 2026-10-28: 5 accepted / 45 limited in 263ms.
- [x] Add API tests for oversized customer, phone, email, title, description and value; extend disposable SQL validation for oversized customer, email, title, description and value.
- [x] Add and run a disposable-PostgreSQL script issuing ten concurrent duplicates with one idempotency key; all returned one lead and persisted exactly one event (2026-10-28).
- [x] Test a filled honeypot is silently acknowledged without creating or exposing a lead; API contract test returns 202 without persistence.
- [x] Assert the API response omits the created/foreign lead id and tenant/customer data.
- [x] Prepare a manual staging-apply and verification procedure with dependency preflight; current fresh-snapshot gate blocks applying until dependencies are confirmed.

### Task 5: k6 load scripts and measured report

**Files:**
- Add: `load/owner-dashboard.js`
- Add: `load/public-intake.js`
- Add/update: `docs/load-results.md`

- [x] Add the 30-owner/100-employee 10-minute k6 profile. The live run still needs the 130 distinct synthetic staging account/lead fixtures.
- [x] Exercise dashboard reads, lead-list reads, status writes and a 500-row CSV dry-run in the script; CSV contents are generated in memory and never saved.
- [x] Encode read p95 < 800 ms, write p95 < 1500 ms and error rate < 1% as fixed thresholds.
- [x] Add the 200-per-minute public intake script with unique synthetic request keys and explicit 429 accounting; requests traverse Vercel's single public origin, so same-origin rate limiting is expected.
- [x] Support protected local fixture files for the 130 bearer tokens so the load test does not depend on oversized GitHub Secrets; ignore `.local-load-fixtures/` and never upload fixture contents.
- [x] Add `docs/load-results.md` with NOT RUN status, required evidence fields, and blockers. Actual UTC run measurements remain pending the staging fixtures.
- [ ] Create an issue list for every failed threshold; do not call a missing run a pass.

### Task 6: Sentry, route errors and Playwright flow errors

**Files:**
- Review/update: `src/shared/lib/sentry.ts`
- Review/update: `src/app/providers/ErrorBoundary.tsx`
- Update: route composition and Supabase error states
- Add: Playwright test covering login, lead status change, CSV import, export and logout
- Add/update: `docs/runbook-incident.md`

- [ ] Verify every top-level route renders inside an error boundary and a failed Supabase request produces a readable recovery state.
- [ ] Add a Playwright uncaught-console-error assertion across the full owner journey.
- [x] Add a staging-only Playwright owner journey covering login, synthetic lead status change, CSV import, export and logout; restore the seed lead's original status in `finally`. Live Preview execution remains pending staging credentials and a current deployment.
- [ ] Send one synthetic staging error to Sentry and verify the event contains only internal company UUID and approved role tags, with no email or names.
- [ ] Save event reference and timestamp without copying user data or secret DSNs into the repository.

### Task 7: Honest marketing and legal identity gate

**Files:**
- Update: landing and login copy
- Update: unavailable-module labels
- Update: legal identity placeholder block
- Update: `tests/landing-claims.test.ts`

- [x] Keep unproven claims replaced with “scénář pilotu” and “plánované funkce” until Tasks 1–5 have live evidence; the copy now describes acceptance as planned work rather than completed behavior.
- [x] Label calendar, analytics, quotes, documents, communication and portal as excluded/unavailable from the first pilot.
- [x] Show a visible incomplete legal identity block until IČO, legal address and approved VOP are explicitly supplied through build configuration.
- [ ] Verify the built preview and public production surfaces separately; report any deployment drift.

### Task 8: Stripe TEST mode end-to-end

**Files:**
- Add/update: Stripe Preview acceptance script
- Add: `docs/billing-acceptance.md`
- Review: Checkout, webhook, billing portal and subscription access transitions

- [ ] Prove Preview is configured to Stripe TEST mode before creating a session.
- [ ] Purchase Start with test payment data; verify signed webhook and `subscription_status=active` for the correct tenant and owner access.
- [ ] Cancel through billing portal; verify access remains until period end, then expires as specified; verify `past_due` shows the correct screen.
- [ ] Record timestamps, Stripe test event/session references, Preview commit and safe outcomes; do not record payment credentials.
- [ ] If test-mode credentials, owner access or portal configuration are unavailable, keep the release gate open and document the exact operator action.

## Completion audit

- [ ] Every prompt 1–8 has implementation evidence and a status based on the required runtime scope.
- [ ] No production writes occurred.
- [x] All local test, typecheck and build results are recorded. GitHub Actions runs [40687311335](https://github.com/svobonek-lab/dashboard/actions/runs/40687311335), [40689392033](https://github.com/svobonek-lab/dashboard/actions/runs/40689392033), and [40689729088](https://github.com/svobonek-lab/dashboard/actions/runs/40689729088) did not allocate runners (failed jobs have runner ID 0 and no steps); GitHub's annotation says recent account payments failed or the spending limit must be increased. Vercel Preview checks for PR #133 passed on commits `975787e` and `289add3` for both the Dashboard and Jobflow projects. These GitHub results are account-level blockers, not evidence that the jobs' code passed or failed.
- [x] Re-ran the database acceptance jobs locally against disposable PostgreSQL 17 on 2026-10-28: historical migration chain; outbox run evidence; AI dispatcher and immediate email notifications; public intake field/rate-limit/idempotency (50 requests in 303 ms: 5 accepted, 45 limited; ten duplicate submissions produced one lead); platform support and company onboarding; lead notes/files/Storage isolation; Stripe billing SQL; paid provisioning; tenant JWT boundary; StavbaCore-shaped reconciliation; and paid provisioning with JWT boundaries all passed. The pgTAP build also passed the expected pre-migration red proof, unknown-table preflight, four policy/grant mutation guards, 10 Auth-hook assertions and 42 RLS assertions. Stripe concurrent delivery passed three runs (one applied event, one duplicate). Each database run used and removed a disposable local container; none accessed staging or production.
- [x] Read-only staging inspection on 2026-10-28 confirmed one pre-existing synthetic owner account has confirmed email and an active owner membership in an active company. The deterministic A/B seed accounts were absent; the GitHub Actions inventory lacks the staging service-role key and employee-B credentials. See `docs/staging-two-tenant-seed.md`. No staging rows were changed.
- [ ] Staging/Sentry/Stripe/live load gates are supported by current runtime evidence or explicitly remain release blockers.
- [x] Open a reviewable draft PR #133; do not merge it or enable auto-merge.
