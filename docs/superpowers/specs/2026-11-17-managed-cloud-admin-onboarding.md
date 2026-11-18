# Managed Cloud personal onboarding with Stripe Checkout

## Decision and scope

On 2026-11-17 the owner chose verified production Stripe Checkout for the first bill. The only new-company path is a platform administrator creating a company and owner invitation. Public paid registration and its API endpoint must stay closed even if legacy feature flags are set. Existing tenants and their billing history remain intact.

Production Supabase, Vercel environment, Stripe keys, prices, products, webhook and Auth configuration are separate review artifacts. This change does not apply production configuration or migrations.

## Required sequence

1. Platform admin chooses an approved recurring plan (`starter`, `growth`, or `pro`), enters a new owner email, and records the two legal agreements. A service-only, actor-bound transaction creates the company with `subscription_status='not_configured'`, a pending owner invite, an outbox item, and an audit event. The public form stays off. Duplicate owner email or company slug is rejected before any invitation is sent.
2. The outbox worker generates a single-use Auth invitation link, encrypts it at rest using `EMAIL_LINK_ENCRYPTION_KEY`, and submits it through the configured provider. The UI says queued until the provider confirms delivery. A provider failure leaves a retryable or review-required record and cannot activate the company.
3. The invited owner sets a password and accepts the invite and legal agreements. The database records one active owner membership and the acceptance audit. `SubscriptionGuard` still blocks the workspace while the subscription is `not_configured`; the employee branch never offers payment.
4. The owner starts hosted Stripe Checkout. Server code derives exactly one company from the authenticated active owner membership, chooses its plan's price from server configuration, binds one Stripe Customer, and uses the verified `PUBLIC_APP_URL` for return URLs. No browser value can select a tenant, price, or subscription state.
5. A signed, paid `checkout.session.completed` event is the sole first-activation authority. The database verifies tenant, Customer, Subscription and Checkout bindings under lock, applies the active entitlement and audit event atomically, and treats replay as duplicate. `customer.subscription.updated` or a no-payment Checkout cannot activate a previously `not_configured` tenant. Subsequent signed subscription events can update an already activated tenant using the existing billing contract.
6. After activation and session refresh, the owner can enter the workspace and invite an employee. The employee can enter only while the tenant entitlement remains active.

## Failure and compensation

| Failure | State and compensation | Evidence |
| --- | --- | --- |
| Duplicate owner email or slug | Reject before creation; no company, invite or outbox row | API result and no-write staging check |
| Missing/invalid `PUBLIC_APP_URL`, encryption key, Auth redirect or provider | Fail closed before send/Checkout; keep pending state or cancel only an unaccepted creation whose queue was absent | Config check, outbox state, platform audit |
| Provider reject/timeout | Retain encrypted retry material within its lifetime; retry under stable idempotency key, then manual review on ambiguous outcome | Outbox row and run evidence, no active entitlement |
| Expired/revoked link or wrong company | Reject acceptance; resend revokes old invite and queues a new one; no membership created by the rejected token | Invite state and acceptance audit/denial |
| Checkout canceled/unpaid or webhook arrives out of order | Stay `not_configured`; owner can retry Checkout with a new request ID | Stripe event metadata and company status |
| Paid webhook database failure | Return retryable error to Stripe; transaction leaves no partial active entitlement | Webhook event/audit transaction and replay result |
| Non-active entitlement | Owner sees payment/recovery action; employee sees no payment action; workspace data stays blocked | UI and direct API/RLS checks |

## Acceptance

Use two **new synthetic companies** in isolated staging from the platform admin UI. For each record the exact order: created and queued, provider delivered, owner accepted, paid TEST Checkout and signed webhook activated, owner and employee access. Capture identifiers and timestamps without email links, tokens or customer data. Exercise duplicate email, expired link, wrong-company acceptance, non-active entitlement and provider failure. Verify an audit/event record and compensation for every stage. Read-only metadata checks must confirm the deployed RPC definition, `not_configured` default, RLS/grants, Auth redirect allowlist and the required environment variable presence without printing secrets.

Production release is a separate proposal containing the reviewed SQL diff, exact app and landing HTTPS origins, Auth redirects, Stripe live products/prices/webhook scope, secret names (never values), rollback, and an owner approval gate.
