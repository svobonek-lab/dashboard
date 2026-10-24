# Paid tenant provisioning (staging proposal)

The signed Stripe webhook recognizes only server-created checkout metadata onboarding=paid_registration. With PAID_ONBOARDING_ENABLED=true, it forwards the signed tenant, customer, subscription, checkout session and payment status to app_provision_paid_checkout. Missing gate fails closed with HTTP 500 for Stripe retry.

The service-only RPC locks an existing registration intent, checks exact customer/session/tenant binding and paid status, rechecks verified Auth UUID/email, then creates company, owner membership (the current app schema user profile), persisted workspace defaults and TOS/DPA evidence. Existing billing-event idempotency remains inside this transaction. Any failed insert rolls everything back. Replayed events do not create another company.

Important remaining implementation: the registration/Checkout producer must create the verified intent before presenting payment, using server-derived Auth UUID and an allowed plan/price. This PR does NOT yet provide that self-service producer or its UI, so do not enable the flag or promise zero-touch signup yet.

Release requires manual staging SQL review, synthetic end-to-end paid test, session refresh for the JWT tenant hook, and rollback/replay checks. Production settings remain untouched. Local SQL test used embedded PostgreSQL/PGlite; CI repeats on disposable PostgreSQL 17.

The test-mode server producer now exists at POST /api/billing?route=register. It validates two agreements and request UUID, derives the verified owner from bearer Auth, reserves a durable request-scoped intent through service-only RPC, chooses only the server pilot Price, creates/reuses Stripe Customer+Session through stable idempotency keys, and binds them before returning the payable URL. Browser tenant/user/price inputs are ignored.

Remaining: signup screen and verified-email return integration. Never enable PAID_ONBOARDING_ENABLED until that UI, merged SQL prerequisites, session refresh and staging tests are accepted. No real payment has been made.
