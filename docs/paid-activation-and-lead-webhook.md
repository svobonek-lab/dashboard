# Paid activation and public lead webhook

## Repository and data model

StavbaFlow is a React 19 and TypeScript application built with Vite, Tailwind CSS 4, and Supabase JS. Browser code follows feature sliced design under `src/app`, `src/pages`, `src/widgets`, `src/features`, `src/entities`, and `src/shared`. Vercel Node functions live under `api/` and the same handlers are mounted locally by `vite.config.ts`. The separate `connector/` package implements the optional customer database connector. Root SQL migrations describe database changes; `supabase/staging/` stores review contracts for the isolated staging environment.

The customer data model uses `app_companies` for workspaces and billing status, `app_members` for owner/employee access, and `app_leads` for inquiries. `app_public_intake_events` stores rate-limit and idempotency receipts. Existing subscription webhook receipts are stored in `app_stripe_webhook_events`; this change adds `app_stripe_setup_payment_events`. The app uses server-only Supabase service credentials behind Vercel functions. RLS stays enabled, and public roles receive no direct access to Stripe event data or the setup-activation RPC.

## One-time activation

The owner settings page offers **Aktivovat / upgradovat tarif · 4 900 Kč** only when the signed-in user is the company owner and billing status is `not_configured`. The modal says that this is a single payment without automatic renewal.

`POST /api/stripe-setup-checkout` derives the owner and tenant from the verified bearer session. The server creates a Stripe Checkout Session in `payment` mode for exactly `490000` minor units in CZK. The browser cannot choose the amount, workspace, customer, or product. Card is the only enabled method.

The shared `/api/stripe-webhook` verifies Stripe's signature over the raw request bytes. Activation is accepted only for `checkout.session.completed` with the expected workspace binding, purchase type, offer version, paid status, amount, currency, customer ID, and session ID. The service-only `app_apply_stripe_setup_payment_event` database function deduplicates events and sets `subscription_status='active'`. It does not change the workspace suspension flag or plan.

This is a one-time activation entitlement. It does not create a recurring subscription; access remains active until an operator suspends the workspace. The payment alone does not promise a support duration or other recurring service. Existing monthly subscriptions and the Stripe billing portal remain separate.

The SQL is a proposal and is not applied here. Review and apply **one** matching contract to the intended isolated database:

- `supabase/migrations/20261124112048_stripe_setup_payment_activation.sql` for normal migration history.
- `supabase/staging/20261124_stripe_setup_payment_activation.sql` for a manually reviewed staging-only install.

These are equivalent alternatives, not two migrations to apply to the same database. Production Supabase remains read-only during this work.

## Public lead webhook

`POST /api/webhook/lead` accepts `company_slug`, `name`, `phone`, `email`, and `service_type`; `notes` is optional. The tenant slug can be in the JSON body or in the `company_slug` query parameter; `public_key` is also accepted as an alias. The company must have its public form enabled. Vercel rewrites this public path to the existing `/api/public-intake` function, so it does not consume an extra serverless function slot.

```json
{
  "company_slug": "ukazkova-firma",
  "name": "Eva Malá",
  "phone": "+420 777 123 456",
  "email": "eva@example.cz",
  "service_type": "Rekonstrukce koupelny",
  "notes": "Prosím o zaměření během příštího týdne."
}
```

`name`, `phone`, and `service_type` are required; `email` and `notes` may be empty. An optional `request_key` or `idempotency_key` supports caller-controlled retries. If omitted, an opaque stable key is derived from the normalized fields. A filled `website` honeypot is acknowledged without a write.

The route maps the payload to the existing `app_submit_public_lead` service-role RPC rather than giving the public endpoint direct table access. That preserves slug-based tenant lookup, the five-submissions-per-IP-per-ten-minutes limit, idempotency, input bounds, and privacy-safe responses. CORS preflight permits forms hosted on other websites. Requests are capped at 16 KiB.

```js
await fetch('https://app.example.cz/api/webhook/lead', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    company_slug: 'ukazkova-firma',
    name: 'Eva Malá',
    phone: '+420 777 123 456',
    email: 'eva@example.cz',
    service_type: 'Rekonstrukce koupelny',
    notes: 'Prosím o zaměření příští týden.'
  })
});
```

## Demo mode

`/demo` and `/demo/leads` already show realistic synthetic Czech construction inquiries, employees, and active jobs from `src/features/public-demo/model/demoData.ts`. They are marked read-only and reject writes. This satisfies the demo requirement without inserting sample data into a customer database.

## Exact Vercel configuration

Configure the project that serves the app. Keep staging/Preview values separate from Production; use a verified custom HTTPS app domain, not a Vercel deployment alias.

Browser-visible configuration:

```dotenv
VITE_DEPLOYMENT_SURFACE=app
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase-publishable-or-anon-key>
VITE_APP_SCHEMA_READS=true
PUBLIC_APP_URL=https://app.example.cz
PUBLIC_LANDING_URL=https://www.example.cz
```

Server-only configuration:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-Supabase-service-role-key>
STRIPE_BILLING_MODE=test
STRIPE_SECRET_KEY=<Stripe-test-secret-key>
STRIPE_WEBHOOK_SECRET=<Stripe-webhook-signing-secret>
STRIPE_SETUP_PAYMENT_ENABLED=false
INTAKE_HASH_SECRET=<random-secret-at-least-32-characters>
```

For Vercel Production, use `STRIPE_BILLING_MODE=live` and a live Stripe secret key. The application rejects test billing mode in Production. Leave `STRIPE_SETUP_PAYMENT_ENABLED=false` until the database contract is installed and reviewed. Configure the Stripe webhook URL as `https://app.example.cz/api/stripe-webhook` with `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`; the latter two are used by existing recurring billing. Store the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.

After the exact environment's database contract and synthetic TEST Checkout/webhook acceptance pass, set `STRIPE_SETUP_PAYMENT_ENABLED=true`. No Stripe Price ID is required for this fixed one-time fee; the server owns the amount. Existing monthly price variables remain separate. Never prefix service-role, Stripe, or intake hash secrets with `VITE_`.

`GEMINI_API_KEY`, `AI_INBOX_SIGNING_SECRET`, email provider variables, and `VITE_SENTRY_DSN` configure optional existing features and are not needed for this activation or website-form webhook.

## Release boundary

Code, Vercel environment configuration, Stripe webhook setup, and the database change are separate release steps. A migration proposal in Git does not prove that the target Supabase database has the function. Do not onboard a paying customer until the intended environment has the migration and a complete synthetic Checkout/webhook acceptance.
