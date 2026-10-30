# Stripe TEST Acceptance Implementation Plan

> **For agentic workers:** Execute this plan natively in the current staging branch. Do not use production systems.

**Goal:** Prepare and run the Stripe TEST Checkout acceptance for synthetic company A without exposing stored credentials.

**Architecture:** A narrowly scoped `workflow_dispatch` mode uses GitHub Actions secrets and branch-scoped Vercel Preview variables to create a Test Clock and synthetic customer, bind it through the existing staging RPC, and create a Checkout session. The one-time Checkout URL is retained only as a short-lived private artifact; the browser purchase confirmation remains manual.

**Tech Stack:** Node 24, existing `stripe` and `@supabase/supabase-js` packages, Vercel CLI, GitHub Actions, Playwright.

**Spec:** `docs/billing-acceptance.md`

## Global Constraints

- Only Supabase staging project `xwzweltjvreqhjpbjrxa` and Stripe TEST mode are allowed.
- Do not print, commit, artifact, or expose secrets or Auth tokens.
- Restrict the setup workflow to the approved staging runner branch and self-hosted runner.
- Bind only synthetic company A; never touch company B or production.
- Keep Checkout and Billing Portal confirmation in the human-controlled Stripe TEST browser.
- Use the existing idempotent `app_bind_stripe_customer` RPC; do not directly update billing columns.

## Review Focus

- A production or live Stripe target must fail before any API mutation.
- A missing or mismatched company A binding must fail closed and never overwrite another customer.
- Re-running setup must reuse the same Test Clock/customer or abort safely.
- Checkout URLs and Auth tokens must not appear in logs or ordinary job outputs.
- An unavailable Vercel branch environment must stop before creating Stripe objects.

---

### Task 1: Add the staging billing setup runner

**Files:**
- Create: `scripts/prepare-staging-stripe-checkout.mjs`
- Test: `tests/staging-stripe-checkout.test.ts`
- Modify: `.github/workflows/staging-e2e.yml`
- Modify: `docs/billing-acceptance.md`

**Interfaces:**
- Consumes only the exact staging URL/ref, company A ID, staging publishable/service keys, synthetic owner A credentials, Preview URL and branch-scoped Vercel Preview values.
- Produces redacted metadata and a one-day private artifact containing the Checkout URL.

- [x] **Step 1: Write tests** for production/live rejection, wrong company ID rejection, missing environment rejection, and redaction of session URLs/tokens from log output.
- [x] **Step 2: Run the new test file** and confirm it fails because the setup module is not implemented.
- [x] **Step 3: Implement a minimal guarded setup script** that validates the exact targets, verifies Starter price and company state, creates or reuses the Stripe TEST Test Clock/customer with idempotency, binds via `app_bind_stripe_customer`, signs in as owner A using GitHub secrets, and requests a Checkout session without logging its URL.
- [x] **Step 4: Run focused and full local unit tests**.
- [x] **Step 5: Add a manually dispatched, exact-branch self-hosted workflow mode** that supplies only the needed Preview env to the runner, runs the script, uploads only the private one-day Checkout artifact, and never echoes secret values.
- [x] **Step 6: Update the acceptance log** with the prepared test state and remaining manual confirmation.
- [ ] **Step 7: Commit and open a reviewable PR; run the setup mode on the self-hosted runner.**

### Task 2: Complete browser acceptance

**Files:**
- Modify: `docs/billing-acceptance.md`

- [ ] **Step 1:** Open the short-lived Checkout URL in the staging browser and verify the Checkout page is in Stripe TEST mode for synthetic company A.
- [ ] **Step 2:** Pause before the final Pay action and obtain action-time confirmation.
- [ ] **Step 3:** Verify signed webhook delivery, company A subscription state, and owner access; record only safe Stripe IDs and UTC timestamps.
- [ ] **Step 4:** Prepare the Billing Portal cancellation and period-end Test Clock advance; request action-time confirmation before the final cancellation action.
- [ ] **Step 5:** Verify cancellation and `past_due` behavior without mutating company B or production; document any state that cannot be safely restored.
