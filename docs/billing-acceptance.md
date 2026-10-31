# Stripe TEST billing acceptance

**Status: PARTIAL — Stripe TEST purchase and signed webhook passed for synthetic company A.** Hosted Checkout completed in Stripe Sandbox for the monthly Starter plan. The staging webhook recorded and applied `checkout.session.completed`; the company is bound to the resulting TEST subscription and remains `active`. Cancellation through the Billing Portal, period-end access removal, and the `past_due` screen remain unverified. Company A was already `active` before this purchase, so the run does not prove a transition from blocked to granted access.

## Verified preflight (2026-10-30)

- The staging Preview deployment `https://dashboard-162jjkww6-svobonek-6462s-projects.vercel.app` is `READY` and targets Preview. Its stable staging alias is `https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app`.
- Vercel metadata (names and scopes only; secret values were not read) shows `STRIPE_SECRET_KEY` in Preview and branch-scoped `STRIPE_BILLING_MODE`, `STRIPE_PRICE_STARTER_ID`, `BILLING_RETURN_URL`, and the correctly named `STRIPE_WEBHOOK_SECRET` for `codex/staging-e2e-local-runner`.
- An unauthenticated `POST /api/stripe-checkout` to the staging alias returned HTTP 401 `BILLING_AUTH_REQUIRED`. It reached the auth gate without creating a customer or Checkout Session. This confirms the handler did not fail its initial billing configuration check; it does not verify Stripe API credentials or the price object.
- Stripe TEST Workbench shows the active destination named “StavbaFlow test” points to the staging alias `/api/stripe-webhook`. It currently listens to 251 event types and reports zero deliveries. No test event was sent.
- A read-only staging query found synthetic company A on plan `starter`, active, with no bound Stripe customer; synthetic company B remains unchanged. The configured branch-only price is Starter. Do not change either tenant with direct SQL; plan selection must go through the approved platform-admin path.

## Current acceptance limitation

Company A is now on `starter`, and the owner A password is available only through the staging GitHub secret. Company A already has `subscription_status=active` from earlier login testing, before it has any Stripe customer or subscription. Therefore, the eventual paid Checkout can prove the signed webhook creates the Stripe subscription binding, and cancellation can prove that access is removed; it cannot by itself prove that payment granted access. Do not fabricate a webhook or directly edit billing state to make that test appear to pass. A separate valid starting state is needed for a complete grant-access assertion.

Period-end and renewal-failure checks need a Stripe Test Clock. The test customer must be created under that clock and bound to synthetic company A before Checkout. The ordinary app-created customer is not attached to a Test Clock, and a normal customer cannot be retrofitted into one later.

The staging-only setup runner and `billing-setup` mode are on `codex/staging-e2e-local-runner`. The first run (`41136059552`) stopped before Stripe API access because Vercel CLI does not return saved `Secret` values to Actions. The workflow was corrected to use `vercel env pull` for only allowlisted non-secret Preview config and the separate GitHub secret `STAGING_STRIPE_SECRET_KEY`. The successful staging-only run is [`41196812974`](https://github.com/svobonek-lab/dashboard/actions/runs/41196812974). It verified TEST mode and the monthly Starter price, created the company A Test Clock and customer, bound that customer through `app_bind_stripe_customer`, then requested and verified the Checkout session through the deployed staging endpoint. Its Checkout URL is only in a private one-day Actions artifact; logs contain only safe IDs. The pulled non-secret config file and local handoff were removed from the ephemeral runner at job completion.

## Acceptance log

Use UTC timestamps and record only safe Stripe test event/session IDs. Never write card details, customer emails, names, secrets, or request payloads here.

| Step | Timestamp (UTC) | Result | Safe evidence |
|---|---|---|---|
| Verify staging Preview config and deployment | 2026-10-30 20:48 | Passed, preflight only | Ready Preview; correct branch scopes; unauthenticated handler returned `401 BILLING_AUTH_REQUIRED` |
| Confirm Stripe TEST endpoint target and activity | 2026-10-30 20:48 | Passed, read-only | Active TEST destination targets the staging alias; 0 deliveries |
| Set synthetic company A to Starter through the approved audited staging operation | 2026-10-30 | Passed | Read-only staging query confirmed plan `starter`; A remains active and unbound |
| Prepare Test Clock, customer and Starter Checkout URL | 2026-10-31 11:31 | Passed | Run `41196812974`; `cus_VXfrj58DuUmugs`, `clock_1UWaVVCcWnL6sJWy7rGC7f4S`, session `cs_test_a1Q86HlLosLqcTPTUCXInVZClRlzR0atOpd1GWHCGpj5NIX2hm1p8HboB9`; no payment submitted |
| Complete Stripe TEST payment in hosted Checkout | 2026-10-31 11:50 | Passed | Stripe Sandbox displayed Starter, 2,990 Kč/month; public test Visa accepted; redirected back to the staging `/login`; no real payment information used |
| Verify signed webhook sets the correct tenant to `active` | 2026-10-31 11:50 | Passed | Staging row for `e2e-synthetic-company-a` has the TEST customer/subscription IDs; `app_stripe_webhook_events` recorded `checkout.session.completed` with result `applied` at `11:50:05 UTC` |
| Verify owner access after activation | 2026-10-31 11:58 | Passed, with starting-state caveat | Post-purchase staging Playwright run `41198728965` passed all 11 scenarios; the owner critical flow observed company visible, active and subscription `active`. Company A was already active before checkout, so the run does not prove a blocked-to-active transition. |
| Cancel through Billing Portal | NOT RUN | Awaiting confirmation at cancellation step | Subscription is active; no cancellation requested |
| Advance Test Clock to period end and verify access removal | NOT RUN | Blocked on Billing Portal cancellation | Test-clock customer and subscription now exist |
| Verify the `past_due` screen after a failed renewal | NOT RUN | Blocked | No test-clock renewal |

## Remaining manual sequence

1. The hosted TEST purchase and signed `checkout.session.completed` event are recorded above. Never reuse or share the one-day Checkout handoff.
2. Verify signed-in owner access after payment, then use the owner’s Billing Portal to schedule cancellation at period end. Verify access remains until the clock reaches period end, then check the signed deletion/update event and access removal.
3. To verify `past_due`, use a separate synthetic company/customer on a Test Clock, attach Stripe’s documented decline test method before renewal, advance the clock, and verify the webhook state and owner screen. Do not turn Company A’s paid-cancellation scenario into a failed-renewal scenario.

Do not use a direct database update to fabricate webhook state. Never use production Stripe, production Supabase, real payment information, or real customer data for this acceptance.
