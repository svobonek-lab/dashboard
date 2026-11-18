# Managed Cloud Admin Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make platform-admin invitation followed by paid Stripe Checkout the only personal company setup path.

**Architecture:** The platform API and SQL create a paid-plan company with no entitlement and a queued owner invitation. A signed paid Checkout event is the first activation authority; later subscription events use the existing billing lifecycle. Public self-registration is closed in both UI and API.

**Tech Stack:** React 19, TypeScript, Vite, Vercel Functions, Supabase Postgres/Auth, Resend outbox, Stripe Checkout, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-managed-cloud-admin-onboarding.md`

## Global constraints

- Work only on `codex/managed-cloud-onboarding`; never merge or deploy automatically.
- Never write to Production Supabase or expose secrets, links, tokens or customer rows.
- Staging SQL changes are proposals until separately reviewed; test them on disposable PostgreSQL first.
- Do not add any browser operation that sets `subscription_status`.
- Staging uses Stripe TEST; live Stripe configuration is a separate production review.

## Review focus

- A subscription update delivered before paid Checkout must not activate a new tenant.
- An existing Auth email or mismatched invite company must not create another owner identity.
- Provider ambiguity must preserve idempotency and never send a plaintext fallback link.
- Legacy `business` and existing active tenants must remain valid after plan constraint changes.
- All browser-visible URLs and Stripe prices must come from verified server configuration.

## Tasks

### 1. Verify current staging contracts and configuration

- [x] Compare the staging onboarding RPC signature, plan/status defaults and constraints with repository SQL using metadata-only queries.
- [ ] Capture fresh staging Auth redirect and hook metadata via the read-only snapshot workflow.
- [ ] Inventory staging Preview environment variable names and configured Stripe TEST prices without disclosing values.
- [ ] Record drift and prerequisites in a review note.

### 2. Close self-service company creation

- [ ] Add failing route/API tests proving `/register-paid` and `POST /api/billing?route=register` never create a company, even if legacy flags are true.
- [ ] Remove registration CTA destinations from the landing and login flows; keep contact and login paths.
- [ ] Fail closed at the registration API entry point and preserve read-only explanation for old links.
- [ ] Run targeted route, billing and browser tests; commit.

### 3. Create a paid-plan company with no entitlement

- [ ] Add failing API and disposable SQL tests for `starter/growth/pro`, duplicate email, legal consent, exact audit/outbox row and `not_configured` status.
- [ ] Update platform admin form and API validation; reject `pilot` for new paid onboarding.
- [ ] Write additive staging SQL proposal based on the fresh live RPC definition; preserve existing history and old tenant plans.
- [ ] Test migration on disposable PostgreSQL including rollback of failed creation; commit.

### 4. Require paid Checkout for first activation

- [ ] Add failing webhook/SQL tests for paid completion, duplicate event, out-of-order subscription event, no-payment Checkout and wrong-company binding.
- [ ] Extend the service-only billing contract with a first-activation transaction and audit event; keep existing renewal behavior.
- [ ] Update webhook persistence and owner guard copy; validate `PUBLIC_APP_URL` and server-side price selection.
- [ ] Run targeted billing, subscription-guard and disposable SQL tests; commit.

### 5. Verify invite delivery and recovery boundaries

- [ ] Test outbox encryption-key absence, provider failure, expiry renewal, resend and recovery with synthetic fixtures.
- [ ] Confirm staging Auth redirect allowlist includes the exact app login/recovery paths and no wildcard.
- [ ] Record audit and compensation for each failure without printing a bearer link.

### 6. Staging acceptance for two new synthetic companies

- [ ] Obtain separate review of the staging SQL proposal and apply it only through the approved staging process.
- [ ] Set up two controlled synthetic owner mailboxes and a staging Preview with TEST Stripe and required server env.
- [ ] Create both companies through platform admin UI; capture creation, delivery, acceptance, paid activation, owner and employee access in order.
- [ ] Exercise all five negative cases and verify audit plus compensation after each.
- [ ] Remove disposable test fixtures only through the reviewed cleanup procedure; record remaining evidence.

### 7. Production review artifact

- [ ] Write a separate, exact proposal for production DB/Stripe/Auth/Vercel env changes and rollback with no secret values.
- [ ] Run `npm ci`, `npm ci --prefix connector`, `npm test`, `npm run lint`, `npm run build`, targeted Playwright and SQL CI; inspect diff for secrets.
- [ ] Open a reviewable PR and provide staging evidence; leave production changes unapplied.
