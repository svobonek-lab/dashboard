# Production readiness report — 2026-11-03

## Status

**Not ready to certify.** This is a read-only, metadata-only inventory. It makes no production changes and does not read environment-variable values or customer rows. The available Vercel inventory shows only the names and scopes recorded below. A current production migration-history snapshot from the repository-approved project-scoped read-only `supabase-ci` MCP was unavailable, so repository migration application cannot be confirmed.

The production `VITE_PILOT_WRITES` variable exists by name, but its value is masked. Under the requested name-only inspection, its effective state cannot be confirmed. Keep production pilot writes off until a human approves the specific write contract, reviews the exact production schema/RLS/grants, and separately authorizes a release.

## Evidence and limits

- Vercel project `dashboard` Production environment-variable inventory inspected on 2026-11-03. Only names and environment scopes were recorded; values were not revealed.
- The currently visible Production-scoped project variable names are `VITE_PILOT_WRITES` and `INTAKE_HASH_SECRET`. The remaining visible names are scoped to Preview branches.
- The production custom-origin settings `PUBLIC_APP_URL` and `PUBLIC_LANDING_URL` are not present by name; the application must not be deployed with a Vercel deployment URL substituted as a user-facing origin.
- The checked-in [`production-schema-metadata.md`](production-schema-metadata.md) is dated 2026-09-30 and contains schema metadata, but no attributable current migration history, policy predicates, or grants.
- `scripts/staging-metadata-snapshot.mjs` is staging-only. Production inspection must use the project-scoped read-only `supabase-ci` MCP specified in `AGENTS.md`; that MCP is not available in this session. No production migration may be inferred from staging metadata or repository files.
- Presence of an environment-variable name does not establish its value, validity, reachability, or successful runtime behavior.

## Repository migrations not confirmed on Production

No current, attributable Production migration-history result is available. Therefore every SQL migration under `supabase/migrations/` remains **not confirmed on Production**. This does not assert that a migration was never applied; it means the approved evidence is missing.

| Repository migration | Production status |
| --- | --- |
| `20260911000000_schema.sql` | Not confirmed |
| `20260911000001_switch_org.sql` | Not confirmed |
| `20260911000002_verified_signup.sql` | Not confirmed |
| `20260911000003_secure_widget.sql` | Not confirmed |
| `20260911000004_fix_leads_rls.sql` | Not confirmed |
| `20260912000000_real_company_creator.sql` | Not confirmed |
| `20260916000000_atomic_tenant_provisioning.sql` | Not confirmed |
| `20260917000000_security_hardening.sql` | Not confirmed |
| `20260919000000_audit_p0_hardening.sql` | Not confirmed |
| `20260920000001_get_public_org_branding.sql` | Not confirmed |
| `20261025000000_secure_jwt_auth_hook.sql` | Not confirmed |
| `20261026000000_public_intake_rate_limit.sql` | Not confirmed |
| `20261027000000_app_email_outbox_runs.sql` | Not confirmed |
| `20261031185027_allow_canceled_stripe_subscription_rebind.sql` | Not confirmed |
| `20261101131053_three_tier_monthly_plans.sql` | Not confirmed |
| `20261101140813_three_tier_company_plan_check.sql` | Not confirmed |
| `20261101144114_employee_seat_limits.sql` | Not confirmed |

SQL files under `supabase/staging/` are staging contracts/operator scripts; they are not evidence of Production application and are excluded from the canonical migration list.

## Production environment-variable names

### Stripe

These documented Production billing variables are absent by name from the visible Vercel Production inventory:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BILLING_MODE`
- `STRIPE_PRICE_STARTER_ID`
- `STRIPE_PRICE_GROWTH_ID`
- `STRIPE_PRICE_PRO_ID`
- `PUBLIC_APP_URL`

`STRIPE_PRICE_PILOT_ID` and the legacy `STRIPE_PRICE_ID` are also not present in Production. No Stripe configuration value was read. Production Checkout and billing portal returns cannot be certified as configured.

### Email

The documented server-side email variables absent by name from Production are:

- `CRON_SECRET`
- `EMAIL_PROVIDER_API_KEY`
- `EMAIL_FROM`
- `PUBLIC_APP_URL`
- `EMAIL_LINK_ENCRYPTION_KEY`
- `AUTH_EMAIL_LINK_TTL_SECONDS`

The older names `RESEND_API_KEY` and `APP_URL` are absent from the visible Production inventory. Names alone cannot establish provider verification, successful delivery, encryption-key validity, or cron operation.

### Public intake

`INTAKE_HASH_SECRET` is present by name in Production. The canonical custom-origin setting `PUBLIC_APP_URL` and Supabase server/client configuration names (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are absent by name from the visible Production inventory. The intake secret's value, entropy, and live endpoint behavior were not inspected.

## Production feature flags

| Flag | Metadata-only status | Required handling |
| --- | --- | --- |
| `VITE_PILOT_WRITES` | Present in Production; value intentionally not read, so on/off is **unverified**. | Keep off until human approval of the production write contract and verified production schema, RLS, grants, and migration history. Presence of the variable is not approval to enable it. |
| Other documented feature flags | No other flag name is present in the visible Production inventory. | Exact-`true` server/client gates remain unverified from name-only metadata; check an authorized effective runtime/config source before claiming state. |

## Required follow-up

1. Obtain a fresh Production migration-history and schema/policy/grant snapshot using the project-scoped read-only `supabase-ci` MCP. Include project identity and capture time; do not query customer rows.
2. Have an authorized operator confirm that `VITE_PILOT_WRITES` is false without exposing unrelated secret values. Keep it off until an explicit human approval and release decision.
3. Configure and verify the required Production Stripe, email, intake, Supabase, and canonical custom-domain settings only when the owner is ready to approve that work. This report made no such changes.
4. After configuration is approved, complete synthetic end-to-end acceptance for Stripe, email, and public intake before describing those flows as production-ready.

## Change and no-write attestation

This report documents metadata only. No environment-variable value was revealed or changed by the report task. No production migration, database write, or application write was performed.
