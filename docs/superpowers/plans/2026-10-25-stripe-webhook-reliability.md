# Stripe webhook reliability implementation plan

**Spec:** `docs/superpowers/specs/2026-10-25-stripe-webhook-reliability-design.md`

## Global constraints

Keep production Supabase read-only, apply no migrations automatically, preserve the signed raw body and service-only RPC grants, and submit work on a dedicated PR.

## Review focus

- Parallel delivery of the same ID must produce one applied update and one duplicate acknowledgement: disposable PostgreSQL concurrency script.
- Older event delivery must not roll billing state backward: existing `stripe_billing_verify.sql` stale-event case.
- A tampered signature must fail before persistence: handler test with a modified signed payload.
- A malformed signed body must return 400 Problem Details: handler test using the real Stripe verifier.
- A persistence failure must return 500 without leaking the database error: handler failure test.

## Task 1: Problem Details and signature classification

**Files:** `api/_billing/stripe-webhook.ts`, `tests/stripe-webhook.test.ts`.

- [x] Add failing tests for RFC 7807 fields and `application/problem+json` on each error path: wrong method, missing configuration, missing signature, missing/oversized raw body, invalid signature, malformed signed JSON, unexpected verification failure, and persistence failure.
- [x] Require `setHeader` in the webhook response interface and add one `sendProblem(response, status, code)` helper with `type: 'about:blank'`, standard HTTP titles, and fixed details.
- [x] Catch `Stripe.errors.StripeSignatureVerificationError` explicitly as 400; use 500 for unexpected verification failures. Preserve 200 responses for ignored, duplicate, stale, and applied events.
- [x] Run `npx tsx --test tests/stripe-webhook.test.ts` and `npm run lint`.

## Task 2: Prove concurrent database idempotency

**Files:** `supabase/tests/stripe_billing_concurrency.sh`, `.github/workflows/verify.yml`, `tests/stripe-billing-contract.test.ts`.

- [x] Add a disposable PostgreSQL test that calls `app_apply_stripe_subscription_event` twice in parallel with the same event ID and asserts exactly one `applied`, one `duplicate`, one event-log row, and one final state.
- [x] Run the new script in the Stripe billing CI job after the existing SQL contract verification.
- [x] Extend the workflow contract test so CI must keep running the concurrency script.

## Task 3: Documentation and final verification

**Files:** `docs/stripe-billing-runbook.md`.

- [x] Describe the durable event-ID log, company-row lock, timestamp guard, concurrency proof, and Problem Details responses.
- [x] Run `npm test` (319 pass), `npm run lint`, `npm run build`, and `git diff --check`; inspect the staged diff and scan for credentials.
- [ ] Commit to the dedicated branch and open a draft PR. Do not merge or apply SQL.
