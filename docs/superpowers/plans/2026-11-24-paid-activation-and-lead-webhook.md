# Paid Activation and Lead Webhook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paid 4,900 CZK one-time activation flow for existing workspaces, a public tenant-scoped lead webhook, preserve the synthetic demo, and document the deployment configuration.

**Architecture:** Reuse the existing React/Supabase/Vercel/Stripe architecture. The owner-only server route creates a fixed-price Stripe payment Checkout Session; the existing signed Stripe webhook dispatches payment events to a separate service-only, idempotent database contract. `/api/webhook/lead` translates the requested website-form fields into the established public-intake proxy and its rate-limited database RPC. The existing `/demo` remains the synthetic read-only demo.

**Tech Stack:** React 19, TypeScript, Vite, Vercel Functions, Stripe Node SDK, Supabase Postgres/RPC, Node test suite.

**Spec:** User goal dated 2026-11-24 in the active Codex goal.

## Global Constraints

- Work on a dedicated feature branch and open a PR; do not merge or enable auto-merge.
- Production Supabase remains read-only; migration files are proposals and are not applied or deployed here.
- Keep all Stripe and Supabase service credentials server-only.
- Never activate a workspace from the browser return URL; only a verified paid Stripe event may grant access.
- Keep the lead endpoint tenant-scoped, size-bounded, rate-limited, idempotent, and non-enumerating.
- Demo records remain synthetic and read-only.

## Review Focus

- A forged/incorrectly signed Checkout event must not grant access.
- A paid event with mismatched amount, currency, session mode, or tenant binding must fail closed.
- Duplicate and out-of-order Stripe events must not change the wrong workspace or grant stale access.
- Public lead submissions must not select a tenant through an untrusted company UUID or create cross-tenant writes.
- The one-time fee must not be presented as a recurring subscription; the deployment guide must explain its entitlement behavior.

## File Map

- `api/_billing/stripe-setup-checkout.ts`: authenticated owner-only fixed-amount Checkout session.
- `api/_billing/stripe-webhook.ts`: route verified payment-mode completion events to a distinct activation contract.
- `api/billing.ts`, `vite.config.ts`, `vercel.json`: production and local route wiring.
- `supabase/migrations/*stripe_setup_payment*` and `supabase/staging/*stripe_setup_payment*`: reviewable database proposals; never auto-applied.
- `api/public-intake.ts`: adapter for the requested form payload to the existing tenant-scoped lead RPC; `/api/webhook/lead` rewrites to this function to preserve the Vercel function-count limit.
- `src/features/manage-billing/*`, `src/pages/owner/settings/ui/Settings.tsx`: owner-only activation modal and Checkout redirect.
- `.env.example`, `docs/paid-activation-and-lead-webhook.md`: exact configuration, request contract, architecture and release requirements.

## Tasks

### Task 1: Fixed-price owner Checkout

- Add a server route that derives the sole owner tenant from the bearer session, creates/reuses a Stripe customer, and creates a one-time `mode: payment` session for exactly 490000 CZK minor units.
- Add an environment gate and route it through Vercel and Vite middleware.
- Do not trust amount, tenant, or customer values from request JSON.

### Task 2: Signed webhook activation contract

- Extend signed Checkout event parsing for `mode: payment` only when the exact setup-fee metadata is present.
- Require `payment_status=paid`, `currency=czk`, `amount_total=490000`, matching tenant metadata/reference, customer and session IDs.
- Persist event/session idempotently and set only `subscription_status='active'`; preserve plan and suspension state.
- Add service-only SQL proposal(s) with RLS, strict grants, tenant/customer uniqueness checks, event ordering and no public execution.

### Task 3: Owner activation UI

- Add a clearly labeled 4,900 Kč activation button and confirmation modal in Owner Settings.
- Hide it from non-owners; show the exact one-time nature and state that access is granted after webhook confirmation.
- Keep the existing recurring billing portal separately labeled.

### Task 4: Website lead webhook

- Add `POST /api/webhook/lead` and `OPTIONS` routing.
- Accept `company_slug`, `name`, `phone`, `email`, `service_type`, and `notes`; allow the slug in the JSON or query string.
- Map into the existing rate-limited public-intake contract; derive a stable request key when the caller has no idempotency key.
- Preserve a bot honeypot, cross-origin use, bounded fields, no lead/customer data in the response, and generic errors.

### Task 5: Demo and deployment documentation

- Verify by source inspection that `/demo` already provides realistic synthetic company/lead/job data and rejects writes; avoid creating a second demo data source.
- Document the stack, relevant database tables/RPCs, Stripe setup, webhook URL/events, lead payload, and exact Vercel environment variable names and values/placeholders.
- State which SQL proposal must be reviewed and manually applied before enabling production Checkout.

### Task 6: Verification and delivery

- Review changed files and secret scan the diff.
- Do not add or run tests unless the user explicitly requests verification; disclose this limit.
- Run available static/build checks only if dependencies and runtime are already available.
- Open a feature PR without merging.

