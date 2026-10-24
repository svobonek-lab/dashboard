# Paid tenant provisioning (staging proposal)

The signed Stripe webhook recognizes only server-created checkout metadata onboarding=paid_registration. With PAID_ONBOARDING_ENABLED=true, it forwards the signed tenant, customer, subscription, checkout session and payment status to app_provision_paid_checkout. Missing gate fails closed with HTTP 500 for Stripe retry.

The service-only RPC locks an existing registration intent, checks exact customer/session/tenant binding and paid status, rechecks verified Auth UUID/email, then creates company, owner membership (the current app schema user profile), persisted workspace defaults and TOS/DPA evidence. Existing billing-event idempotency remains inside this transaction. Any failed insert rolls everything back. Replayed events do not create another company.

Important remaining implementation: the registration/Checkout producer must create the verified intent before presenting payment, using server-derived Auth UUID and an allowed plan/price. This PR does NOT yet provide that self-service producer or its UI, so do not enable the flag or promise zero-touch signup yet.

Release requires manual staging SQL review, synthetic end-to-end paid test, session refresh for the JWT tenant hook, and rollback/replay checks. Production settings remain untouched. Local SQL test used embedded PostgreSQL/PGlite; CI repeats on disposable PostgreSQL 17.
