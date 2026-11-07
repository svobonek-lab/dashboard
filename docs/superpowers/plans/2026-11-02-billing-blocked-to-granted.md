# Billing Blocked to Granted Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prove that an initially blocked synthetic company gains owner dashboard access only after a paid Stripe TEST Checkout is applied through the signed webhook.

**Architecture:** Provision one isolated synthetic company C and owner in StavbaCore Staging. A single dedicated Playwright acceptance test captures the blocked owner screen, submits a monthly Stripe TEST Checkout, waits for and verifies the resulting signed webhook and database state, then reloads `/dashboard` and proves access. A branch-gated manual workflow supplies staging credentials from existing GitHub secrets and the allowlisted Stripe TEST configuration from the established staging Preview branch. Generate the synthetic owner's random password during the workflow, keep it only in the runner temp directory and a one-day private artifact for the user, and never emit it to logs or docs.

**Tech Stack:** Supabase Auth/Postgres, Stripe TEST, Playwright, GitHub Actions.

**Spec:** User goal in this task. Explicitly excludes production Supabase, Stripe live keys, and changes to prior company A/B report rows.

## Global Constraints

- Only project `xwzweltjvreqhjpbjrxa` named `StavbaCore Staging` may receive writes.
- Staging URL and project ref must be validated, and staging ref must differ from `PRODUCTION_SUPABASE_PROJECT_REF`.
- Stripe configuration must use `STRIPE_BILLING_MODE=test` and an `sk_test_` or `rk_test_` key; validate the price is an active monthly TEST price.
- Company C starts with `subscription_status` not active and no Stripe customer or subscription binding.
- Company A/B fixtures and existing billing acceptance results remain unchanged.
- Do not fabricate a webhook or update subscription status directly after payment. Only the signed Stripe webhook may activate C.
- Never print passwords, Stripe/Supabase secrets, Checkout URL, card details, owner email, or owner name in logs or acceptance docs. The user may retrieve the synthetic password only from this run's one-day private artifact.
- Keep staging Checkout handoff artifact short-lived and restricted to the exact workflow run.

## Review Focus

- Seeder must not reset an already-paid C tenant to a blocked state; test reruns must stop before another Checkout.
- Wrong project, production-shared ref, wrong Preview, or Stripe live mode must fail before any write.
- A completed Checkout without an applied signed webhook must not grant `/dashboard` access.
- Test must verify `checkout.session.completed` is `applied` for C, and the app row's customer/subscription IDs match the paid TEST session.
- hCaptcha may require the account owner to complete the short-lived Stripe TEST Checkout; do not bypass it or report success until payment and webhook are independently verified.

---

### Task 1: Safe synthetic company C provisioning

**Files:**
- Create: `scripts/seed-staging-billing-company-c.mjs`
- Test: `tests/seed-staging-billing-company-c.test.ts`

**Interfaces:**
- Consumes `STAGING_SUPABASE_URL`, project refs, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, and `STAGING_OWNER_C_PASSWORD`.
- Produces `seedStagingBillingCompanyC(env, apply)`; dry-run by default, idempotently creates only `e2e-synthetic-company-c`, sets initial state to `not_configured`, and refuses any paid/partially-bound existing C row.

- [x] Write tests for staging-only URL/ref guard, exact synthetic slug, nonactive initial status, and refusal to reset a paid/already-bound company.
- [x] Confirm the tests failed before the provisioning script existed.
- [x] Implement the provisioning script following `scripts/seed-two-tenants.ts` patterns; print only safe synthetic UUIDs and status.
- [x] Run targeted tests and `npm test`.

### Task 2: Staging-only billing workflow and browser acceptance

**Files:**
- Modify: `.github/workflows/staging-e2e.yml`
- Modify: `scripts/export-staging-stripe-env.mjs` and its test
- Modify: `tests/e2e/support.ts`
- Create: `tests/e2e/billing-blocked-to-granted.spec.ts`

**Interfaces:**
- Consumes the synthetic C seed, the monthly Starter Stripe TEST price, the exact staging Preview, an ephemeral owner C password, and staging-only service-role key.
- Produces an acceptance scenario proving blocked screen → paid TEST Checkout → signed webhook `applied` → active company → owner `/dashboard`.

- [x] Add tests first for the branch allowlist in the Stripe config exporter and the owner C account helper.
- [x] Implement a dedicated manual runner mode restricted to `svobonek-lab/dashboard` and `codex/billing-blocked-to-granted`; it pulls only the existing approved staging Preview configuration and never a production environment.
- [ ] Seed C, then run only the new Playwright spec with retries disabled to avoid duplicate Checkout attempts.
- [ ] In Playwright, assert the initial `Předplatné vypršelo` screen, submit the Stripe TEST form, and poll both Stripe TEST and StavbaCore Staging until the signed Checkout webhook is `applied`, C is active, and both IDs match.
- [ ] Reload `/dashboard`; assert the owner workspace is visible and the expired-subscription screen is gone.
- [ ] If Stripe presents hCaptcha, save a one-day Checkout URL artifact and wait for the owner to complete that test-only challenge without exposing it in public logs.

### Task 3: Acceptance evidence and full verification

**Files:**
- Modify: `docs/billing-acceptance.md` by appending a new `## Blocked to granted transition` heading only; keep previous A/B rows and text unchanged.

**Interfaces:**
- Consumes actual staging workflow results and safe event/session IDs.
- Produces a timestamped result table documenting C's starting blocked state, paid Stripe TEST Checkout, signed webhook application, and post-payment owner `/dashboard` access.

- [ ] Run the dedicated workflow against the existing StavbaCore Staging project; finish the one-time hosted Checkout only with Stripe TEST.
- [ ] Record the start and final state, safe Checkout/webhook IDs, timestamp, and workflow run link under the new heading; record no secret, owner email/name, or card details.
- [ ] Verify the A/B portion of `docs/billing-acceptance.md` is byte-for-byte unchanged from base.
- [x] Run `npm test` (553/553), `npm run lint`, and `npm run build`; inspect the final diff and secret scan after staging acceptance is available.
- [ ] Commit and open a draft PR; do not merge or deploy to production.
