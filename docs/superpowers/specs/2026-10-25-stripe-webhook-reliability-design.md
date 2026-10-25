# Stripe webhook reliability design

## Intent

Accept Stripe subscription events exactly once per event ID, preserve the newest known billing state when events arrive out of order, and return predictable errors that let Stripe retry transient failures.

## Existing contract

`public.app_stripe_webhook_events` already has a unique `event_id`. The service-only `app_apply_stripe_subscription_event` RPC checks that ID, locks the company row, compares `event_created_at`, records the result, and updates billing state in one PostgreSQL transaction. `app_provision_paid_checkout` locks the registration intent and calls the same RPC in its own transaction. Keep this durable database design; a 24-hour Redis entry would be weaker for late redelivery. Do not perform a separate HTTP read of the event table before the RPC, because it cannot close the concurrent-delivery race and direct table grants are intentionally absent.

## Changes

- Keep the RPC as the single point of idempotency and ordering. A duplicate returns `duplicate` and HTTP 200; a stale event returns `stale` and HTTP 200. A persistence failure returns HTTP 500 so Stripe can retry.
- Prove concurrent calls against disposable PostgreSQL in CI. Start two transactions using the same event ID while the first holds its row lock, then assert one `applied`, one `duplicate`, one event-log row, and one billing transition.
- Handle `Stripe.errors.StripeSignatureVerificationError` explicitly as HTTP 400. Distinguish raw-body errors, malformed signed JSON, and unexpected verification failures.
- Return `application/problem+json` with `type`, `title`, `status`, `detail`, and stable `code` for every webhook error. Use fixed detail text; never echo signatures, secrets, event payloads, or database errors. Preserve existing success bodies.

## Boundaries

Do not apply SQL to staging or production. The existing staging SQL remains a review artifact, and CI uses an isolated disposable PostgreSQL container. Preserve the service-only RPC grants and the strict raw-body signature check.
