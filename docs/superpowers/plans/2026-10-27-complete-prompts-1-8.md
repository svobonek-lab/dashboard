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
- [ ] Add an idempotent fixture option to create the synthetic cross-tenant records required by Tasks 2 and 4, with deterministic cleanup.
- [x] Run unit tests and dry-run locally; do not run `--apply` without staging-only credentials and verify their project ref first. `npm test` passed 424/424; `npm run lint` and `npm run build` passed; local dry-run validated the configured staging ref and reported no writes.
- [ ] If credentials are unavailable, record the exact missing secret names and leave live membership acceptance blocked.

### Task 2: Tenant REST, Storage and endpoint isolation

**Files:**
- Update: `tests/e2e/tenant-rest-isolation.spec.ts`
- Update: `tests/e2e/support.ts`
- Add/update: fixture IDs in `docs/staging-two-tenant-seed.md`
- Add/update: `docs/combined-tenant-release-acceptance.md`

- [ ] Derive the complete matrix from actual `app_*` tables, RPCs, API routes and Storage bucket policies.
- [ ] For owner A and employee A, assert no company-B rows are visible and INSERT/UPDATE/DELETE are rejected or demonstrably affect zero rows.
- [ ] Cover leads, notes, file metadata and private Storage object paths, employees, invitations, company profile, export, audit history and public intake response.
- [ ] Prove employee A cannot change a lead assigned to employee B; independently read the lead as owner B after the attempt.
- [ ] Emit a machine-readable table of resource × operation × status; fail if any B fixture is visible or mutated by A.
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
- [ ] Add the notes/files migration as a proposal only and verify it against disposable PostgreSQL.
- [x] Hide note/attachment actions when the capability flag is off and show “Přílohy budou brzy k dispozici”; the capability only enables for the declared staging project, and tests assert disabled state performs no reads.
- [ ] Make CI fail on an unreviewed schema snapshot/migration mismatch.
- [ ] Confirm no migration command is wired to deployment or production.

### Task 4: Public intake abuse and retry acceptance

**Files:**
- Review/update: `supabase/migrations/20261026000000_public_intake_rate_limit.sql`
- Update: `supabase/tests/public_intake_security_verify.sql`
- Update: `tests/public-intake-api.test.ts`
- Update/add: public-intake Playwright or HTTP acceptance test
- Update: `docs/staging-contract-runbook.md`

- [ ] Extend disposable PostgreSQL acceptance to issue 50 same-IP requests within 10 seconds and assert the configured limit returns rate-limit errors without exceeding the accepted lead count.
- [x] Add API tests for oversized customer, phone, email, title, description and value; extend disposable SQL validation for oversized customer, email, title, description and value.
- [ ] Test concurrent duplicate requests with one idempotency key and assert exactly one lead exists.
- [ ] Test a filled honeypot is silently acknowledged without creating or exposing a lead.
- [x] Assert the API response omits the created/foreign lead id and tenant/customer data.
- [x] Prepare a manual staging-apply and verification procedure with dependency preflight; current fresh-snapshot gate blocks applying until dependencies are confirmed.

### Task 5: k6 load scripts and measured report

**Files:**
- Add: `load/owner-dashboard.js`
- Add: `load/public-intake.js`
- Add/update: `docs/load-results.md`

- [ ] Simulate 30 owners and 100 employees for 10 minutes using synthetic staging credentials and records.
- [ ] Exercise dashboard reads, lead list reads, status writes and a 500-row CSV dry-run; never commit CSV data.
- [ ] Enforce read p95 < 800 ms, write p95 < 1500 ms and error rate < 1% without changing thresholds to hide failures.
- [ ] Send 200 public intake requests in one minute using unique synthetic request keys and controlled IP identity.
- [ ] Record exact UTC timestamps, deployment and schema refs, VU profile, thresholds, observed percentiles, error rate and blockers.
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
- [ ] Send one synthetic staging error to Sentry and verify the event contains only internal company UUID and approved role tags, with no email or names.
- [ ] Save event reference and timestamp without copying user data or secret DSNs into the repository.

### Task 7: Honest marketing and legal identity gate

**Files:**
- Update: landing and login copy
- Update: unavailable-module labels
- Update: legal identity placeholder block
- Update: `tests/landing-claims.test.ts`

- [ ] Keep unproven claims replaced with “scénář pilotu” and “plánované funkce” until Tasks 1–5 have live evidence.
- [ ] Label calendar, analytics, quotes, documents, communication and portal as excluded/unavailable.
- [ ] Show an unmistakably incomplete legal identity block until IČO, address and VOP are present.
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
- [ ] All local test, typecheck and build results are recorded, including skipped tests and failed CI jobs.
- [ ] Staging/Sentry/Stripe/live load gates are supported by current runtime evidence or explicitly remain release blockers.
- [ ] Open a reviewable PR; do not merge it or enable auto-merge.
