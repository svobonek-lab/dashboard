# Stripe TEST billing acceptance

**Status: PARTIAL — Vercel Preview config is present; the first setup run stopped before creating Stripe objects.** No test purchase, signed subscription webhook, cancellation, period-end transition, or `past_due` screen has been verified. Do not count local contract tests as end-to-end billing acceptance.

## Verified preflight (2026-10-30)

- The staging Preview deployment `https://dashboard-162jjkww6-svobonek-6462s-projects.vercel.app` is `READY` and targets Preview. Its stable staging alias is `https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app`.
- Vercel metadata (names and scopes only; secret values were not read) shows `STRIPE_SECRET_KEY` in Preview and branch-scoped `STRIPE_BILLING_MODE`, `STRIPE_PRICE_STARTER_ID`, `BILLING_RETURN_URL`, and the correctly named `STRIPE_WEBHOOK_SECRET` for `codex/staging-e2e-local-runner`.
- An unauthenticated `POST /api/stripe-checkout` to the staging alias returned HTTP 401 `BILLING_AUTH_REQUIRED`. It reached the auth gate without creating a customer or Checkout Session. This confirms the handler did not fail its initial billing configuration check; it does not verify Stripe API credentials or the price object.
- Stripe TEST Workbench shows the active destination named “StavbaFlow test” points to the staging alias `/api/stripe-webhook`. It currently listens to 251 event types and reports zero deliveries. No test event was sent.
- A read-only staging query found synthetic company A on plan `starter`, active, with no bound Stripe customer; synthetic company B remains unchanged. The configured branch-only price is Starter. Do not change either tenant with direct SQL; plan selection must go through the approved platform-admin path.

## Current acceptance limitation

Company A is now on `starter`, and the owner A password is available only through the staging GitHub secret. Company A already has `subscription_status=active` from earlier login testing, before it has any Stripe customer or subscription. Therefore, the eventual paid Checkout can prove the signed webhook creates the Stripe subscription binding, and cancellation can prove that access is removed; it cannot by itself prove that payment granted access. Do not fabricate a webhook or directly edit billing state to make that test appear to pass. A separate valid starting state is needed for a complete grant-access assertion.

Period-end and renewal-failure checks need a Stripe Test Clock. The test customer must be created under that clock and bound to synthetic company A before Checkout. The ordinary app-created customer is not attached to a Test Clock, and a normal customer cannot be retrofitted into one later.

The staging-only setup runner and `billing-setup` mode in the manual staging workflow are prepared on `codex/staging-e2e-local-runner`. The first workflow run (2026-10-30, run `41136059552`) stopped before any Stripe object was created: Vercel CLI does not return the saved `STRIPE_SECRET_KEY` Secret value to Actions, so the runner received none of the four billing settings. The workflow has been changed to use a non-deploying `vercel env pull` for the allowlisted non-secret Preview config and a separate GitHub Actions secret named `STAGING_STRIPE_SECRET_KEY` for the Stripe TEST API key. That GitHub secret is not set yet. After it is set, the runner checks the exact staging project and synthetic company slug, requires Stripe TEST mode and a monthly Starter price, creates or reuses a clock/customer, binds through `app_bind_stripe_customer`, and requests Checkout through the deployed staging endpoint. The Checkout URL is written only to a private one-day Actions artifact; log output contains only safe IDs.

## Acceptance log

Use UTC timestamps and record only safe Stripe test event/session IDs. Never write card details, customer emails, names, secrets, or request payloads here.

| Step | Timestamp (UTC) | Result | Safe evidence |
|---|---|---|---|
| Verify staging Preview config and deployment | 2026-10-30 20:48 | Passed, preflight only | Ready Preview; correct branch scopes; unauthenticated handler returned `401 BILLING_AUTH_REQUIRED` |
| Confirm Stripe TEST endpoint target and activity | 2026-10-30 20:48 | Passed, read-only | Active TEST destination targets the staging alias; 0 deliveries |
| Set synthetic company A to Starter through the approved audited staging operation | 2026-10-30 | Passed | Read-only staging query confirmed plan `starter`; A remains active and unbound |
| Prepare Test Clock, customer and Start-plan Checkout URL | 2026-10-30 | Blocked before Stripe API access | Setup stopped because `STAGING_STRIPE_SECRET_KEY` is not present in GitHub Actions; run `41136059552` created no Stripe objects |
| Complete Stripe TEST payment in hosted Checkout | NOT RUN | Awaiting action-time confirmation | No payment action submitted |
| Verify signed webhook sets the correct tenant to `active` | NOT RUN | Blocked | No Checkout event |
| Verify owner access after activation | NOT RUN | Blocked | No paid test subscription |
| Cancel through Billing Portal | NOT RUN | Blocked | No paid test subscription |
| Advance Test Clock to period end and verify access removal | NOT RUN | Blocked | No test-clock customer or subscription |
| Verify the `past_due` screen after a failed renewal | NOT RUN | Blocked | No test-clock renewal |

## Remaining manual sequence

1. Create a Stripe TEST API key and save it directly as the GitHub Actions secret `STAGING_STRIPE_SECRET_KEY` in `svobonek-lab/dashboard`. Never paste the key into chat. Then run the `staging-stripe-billing-setup` workflow on `codex/staging-e2e-local-runner` and download its one-day Checkout handoff artifact. It is restricted to StavbaCore Staging and Stripe TEST.
2. Open the hosted Checkout, verify it is a TEST subscription for company A’s Starter plan, and complete it with Stripe’s test card only after the final confirmation.
3. Confirm `checkout.session.completed` and `customer.subscription.updated` deliveries in Stripe TEST Workbench and verify company A’s state and owner access in staging. Do not paste credentials, card details, emails, or customer payloads into this document or chat.
4. Open Billing Portal as owner A and request cancellation at period end. Verify access remains until the clock reaches the period end, then verify the signed deletion/update event and access removal.
5. To verify `past_due`, attach Stripe’s documented decline test method before a subsequent renewal, advance the same Test Clock, and verify the webhook state and owner screen. Restore synthetic company A’s original staging state and remove only the test-clock objects after recording evidence.

Do not use a direct database update to fabricate webhook state. Never use production Stripe, production Supabase, real payment information, or real customer data for this acceptance.
