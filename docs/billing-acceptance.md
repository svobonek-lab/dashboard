# Stripe TEST billing acceptance

**Status: PARTIAL — configuration is present; paid Checkout acceptance has not run.** No test purchase, signed subscription webhook, cancellation, period-end transition, or `past_due` screen has been verified. Do not count local contract tests as end-to-end billing acceptance.

## Verified preflight (2026-10-30)

- The staging Preview deployment `https://dashboard-162jjkww6-svobonek-6462s-projects.vercel.app` is `READY` and targets Preview. Its stable staging alias is `https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app`.
- Vercel metadata (names and scopes only; secret values were not read) shows `STRIPE_SECRET_KEY` in Preview and branch-scoped `STRIPE_BILLING_MODE`, `STRIPE_PRICE_STARTER_ID`, `BILLING_RETURN_URL`, and the correctly named `STRIPE_WEBHOOK_SECRET` for `codex/staging-e2e-local-runner`.
- An unauthenticated `POST /api/stripe-checkout` to the staging alias returned HTTP 401 `BILLING_AUTH_REQUIRED`. It reached the auth gate without creating a customer or Checkout Session. This confirms the handler did not fail its initial billing configuration check; it does not verify Stripe API credentials or the price object.
- Stripe TEST Workbench shows the active destination named “StavbaFlow test” points to the staging alias `/api/stripe-webhook`. It currently listens to 251 event types and reports zero deliveries. No test event was sent.
- A read-only staging query found synthetic companies A and B both on plan `pilot`, each with `subscription_status=active` and no bound Stripe customer, subscription, or period end. The configured branch-only price is Starter. Do not change either tenant with direct SQL; plan selection must go through the approved platform-admin path.

## Why Checkout has not run

Company A is not on `starter`, and no active platform-admin session is available in this run to make that plan change through the application. The logged-in owner account and Checkout payment step are also unavailable to this run. Stripe documents that its hosted Checkout UI has protections that prevent automated testing, so acceptance must use the real TEST Checkout flow with the provided test card in a browser; it cannot be replaced by a mocked success response.

Period-end and renewal-failure checks need a Stripe Test Clock. The test customer must be created under that clock and bound to synthetic company A before Checkout. The ordinary app-created customer is not attached to a Test Clock, and a normal customer cannot be retrofitted into one later.

## Acceptance log

Use UTC timestamps and record only safe Stripe test event/session IDs. Never write card details, customer emails, names, secrets, or request payloads here.

| Step | Timestamp (UTC) | Result | Safe evidence |
|---|---|---|---|
| Verify staging Preview config and deployment | 2026-10-30 20:48 | Passed, preflight only | Ready Preview; correct branch scopes; unauthenticated handler returned `401 BILLING_AUTH_REQUIRED` |
| Confirm Stripe TEST endpoint target and activity | 2026-10-30 20:48 | Passed, read-only | Active TEST destination targets the staging alias; 0 deliveries |
| Set synthetic company A to Starter through platform admin | NOT RUN | Blocked | No platform-admin session available |
| Start Start-plan Checkout and complete Stripe TEST payment | NOT RUN | Blocked | No authenticated owner Checkout session |
| Verify signed webhook sets the correct tenant to `active` | NOT RUN | Blocked | No Checkout event |
| Verify owner access after activation | NOT RUN | Blocked | No paid test subscription |
| Cancel through Billing Portal | NOT RUN | Blocked | No paid test subscription |
| Advance Test Clock to period end and verify access removal | NOT RUN | Blocked | No test-clock customer or subscription |
| Verify the `past_due` screen after a failed renewal | NOT RUN | Blocked | No test-clock renewal |

## Remaining manual sequence

1. In the staging Preview only, use an active platform-admin account to set **synthetic company A** to **Starter**. Do not change company B or any real tenant.
2. Create a Stripe TEST Test Clock and test customer, bind it to synthetic company A using the existing service-only `app_bind_stripe_customer` operation, then sign in as owner A and complete Start Checkout with Stripe’s test card. Keep all actions in the Stripe sandbox and StavbaCore Staging Preview.
3. Confirm `checkout.session.completed` and `customer.subscription.updated` deliveries in Stripe TEST Workbench and verify company A’s state and owner access in staging. Do not paste credentials, card details, emails, or customer payloads into this document or chat.
4. Open Billing Portal as owner A and request cancellation at period end. Verify access remains until the clock reaches the period end, then verify the signed deletion/update event and access removal.
5. To verify `past_due`, attach Stripe’s documented decline test method before a subsequent renewal, advance the same Test Clock, and verify the webhook state and owner screen. Restore synthetic company A’s original staging state and remove only the test-clock objects after recording evidence.

Do not use a direct database update to fabricate webhook state. Never use production Stripe, production Supabase, real payment information, or real customer data for this acceptance.
