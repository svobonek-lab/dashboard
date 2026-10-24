# Paid tenant provisioning (staging proposal)

The signed Stripe webhook recognizes only server-created checkout metadata onboarding=paid_registration. With PAID_ONBOARDING_ENABLED=true, it forwards the signed tenant, customer, subscription, checkout session and payment status to app_provision_paid_checkout. Missing gate fails closed with HTTP 500 for Stripe retry.

The service-only RPC locks an existing registration intent, checks exact customer/session/tenant binding and paid status, rechecks verified Auth UUID/email, then creates company, owner membership (the current app schema user profile), persisted workspace defaults and TOS/DPA evidence. Existing billing-event idempotency remains inside this transaction. Any failed insert rolls everything back. Replayed events do not create another company.

The server producer reserves a verified registration intent before returning Checkout. The /register-paid screen handles account signup/login, email verification, two required legal agreements, company setup and return from payment. It polls verified membership/subscription after session refresh before navigating to the workspace. Both feature flags remain false pending staging acceptance.

Release requires manual staging SQL review, synthetic end-to-end paid test, session refresh for the JWT tenant hook, and rollback/replay checks. Production settings remain untouched. Local SQL test used embedded PostgreSQL/PGlite; CI repeats on disposable PostgreSQL 17.

The test-mode server producer now exists at POST /api/billing?route=register. It validates two agreements and request UUID, derives the verified owner from bearer Auth, reserves a durable request-scoped intent through service-only RPC, chooses only the server pilot Price, creates/reuses Stripe Customer+Session through stable idempotency keys, and binds them before returning the payable URL. Browser tenant/user/price inputs are ignored.

Release gates: enable VITE_PAID_REGISTRATION_ENABLED and PAID_ONBOARDING_ENABLED only together on the reviewed staging app. Add the exact /register-paid URL to Supabase Auth redirect allowlist; confirm signup/email delivery and configure the reviewed JWT tenant Auth hook (PR #98). Test through a synthetic Stripe test payment and duplicate delivery, then inspect server-owned audit rows and memberships. No real payment has been made. Browser E2E remains unverified while computer access is disabled.

The registration request ID and original agreement timestamp survive same-tab retries in user-scoped sessionStorage; passwords never enter storage. The API validates consent shape; SQL enforces freshness for a new intent and permits an exact retry of an existing intent without rewriting its audit time. Test mode is enforced server-side; live keys are rejected.
