# Production readiness report — 2026-11-03

## Status

**Not ready to certify.** Stripe production configuration is absent by variable name, and the latest attributable production migration history is unavailable. Following the user's later instruction to turn it off, `VITE_PILOT_WRITES` was set to `false` and a Production redeploy completed; the latest public Production bundle confirms the flag is false and its target guard remains closed. The environment update CLI reported the variable's environments as `Production, Preview`; no Preview redeploy was triggered.

The report evidence uses read-only metadata and contains no environment variable values, credentials, or customer rows. The separately authorized `VITE_PILOT_WRITES` change and Production redeploy are documented below; there were no database writes.

## Evidence and limits

- Read the Vercel Production environment-variable inventory for project `dashboard` on 2026-11-03. Only names were retained.
- Read the latest listed Ready Production deployment's public JavaScript bundle (`dashboard-2sqipp8n6-svobonek-6462s-projects.vercel.app`) to evaluate client-side feature flags. The report records only flag states and whether its target equals the known isolated staging target; it does not record Supabase URLs, keys, or other values.
- Production redeploy evidence: Vercel deployment `dashboard-2sqipp8n6-svobonek-6462s-projects.vercel.app`, Ready; the public bundle reports `VITE_PILOT_WRITES=false` and a closed effective pilot-write gate.
- The checked-in production schema snapshot, [`production-schema-metadata.md`](production-schema-metadata.md), is dated 2026-09-30. It documents public table/column/key metadata and RLS enabled status, but contains no migration history, policy predicates, or grants.
- The operator-provided metadata JSON has `rls`, `grants`, `columns`, `policies`, and `functions` sections, but includes no project reference, capture timestamp, or migration-history section. It cannot be attributed to Production or used to confirm applied migrations.
- `scripts/staging-metadata-snapshot.mjs` is guarded for the isolated staging project. Production metadata inspection is restricted by `AGENTS.md` to the project-scoped read-only `supabase-ci` MCP. That tool was not available in this session, so no production DB query was attempted.

## Repository migrations not confirmed on Production

No current, attributable Production migration-history snapshot was available. Therefore **none of the repository SQL migrations below can be marked confirmed on Production**. “Not confirmed” does not assert that a migration was never applied; verify against a fresh Production migration-history result before planning any deployment.

Canonical `supabase/migrations/` entries:

| Migration | Production status |
|---|---|
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

The additional 34 SQL files under `supabase/staging/` are staging contracts or operator SQL, not evidence of Production application. **All are unconfirmed on Production:**

`pilot_public_intake.sql`, `pilot_invitation_resend.sql`, `pilot_invitation_acceptance.sql`, `pilot_history_rollback.sql`, `pilot_helper_isolation.sql`, `pilot_authorization.sql`, `20261101144114_employee_seat_limits.sql`, `20261101140813_three_tier_company_plan_check.sql`, `20261101131053_three_tier_monthly_plans.sql`, `20261029_public_intake_events.sql`, `20261028_stavbacore_invite_accepted_at.sql`, `20261028_staging_lead_status_rpc.sql`, `20261027_stavbacore_jwt_tenant_reconcile.sql`, `20261027_outbox_run_evidence.sql`, `20261027_byodb_operational_queue.sql`, `20261027_byodb_operational_projection.sql`, `20261025_byodb_operations.sql`, `20261024_paid_tenant_provisioning.sql`, `20261024_jwt_tenant_boundary.sql`, `20261016_stripe_billing_completion.sql`, `20261016_legal_consent_contract.sql`, `20261015_stripe_billing_contract.sql`, `20261014_immediate_email_notifications_contract.sql`, `20261013_lead_notes_files_contract.sql`, `20261013_invite_password_proof.sql`, `20261013_invite_password_gate.sql`, `20261012_platform_company_onboarding.sql`, `20261010_platform_admin_write_support_contract.sql`, `20261009_platform_admin_support_contract.sql`, `20261006_ai_dispatcher_contract.sql`, `20261005_platform_admin_contract.sql`, `20261004_connector_contract.sql`, `20260930_import_worker.sql`, and `20260930_app_contract.sql`.

## Production environment variable inventory

### Stripe

The following canonical billing variables are **missing by name** from Vercel Production:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BILLING_MODE`
- `STRIPE_PRICE_STARTER_ID`
- `STRIPE_PRICE_GROWTH_ID`
- `STRIPE_PRICE_PRO_ID`
- `BILLING_RETURN_URL`

The runbook describes `STRIPE_PRICE_PILOT_ID` and legacy `STRIPE_PRICE_ID` as optional/legacy; neither name is present. Stripe Checkout and webhook billing cannot be considered configured for Production. No values were read or changed.

### Email

The names `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, and `APP_URL` are present. This confirms configuration slots exist, not that values are valid, email delivery works, the sender domain is verified, or scheduled jobs succeed.

### Public intake

`INTAKE_HASH_SECRET` is present by name. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are also present by name; the application can fall back to the Vite Supabase URL/key when the server-only aliases are absent. Presence alone does not prove the hash secret has adequate entropy or that intake, rate limiting, and storage work end-to-end.

## Feature flag state

| Flag | Production evidence | State |
|---|---|---|
| `VITE_PILOT_WRITES` | Present in current production bundle as `false` after explicit user instruction and Production redeploy | **Off and confirmed.** Keep it off until a human approves a specific production write contract, reviews the production RLS/grants and migration state, and explicitly authorizes release. The target guard is defense in depth, not approval to enable writes. Vercel's update confirmation reported the variable's scope as `Production, Preview`; the latest Preview deployment predates the change, so Preview bundle state was not used to claim anything about Preview's current setting. |
| `VITE_APP_SCHEMA_READS` | Present in current production bundle as `true` | On. Production data initialization is also enabled by the compiled Production mode, so this flag is not the sole production read gate. |
| `VITE_PAID_REGISTRATION_ENABLED` | Name absent from Production inventory; code enables only on exact `true` | Off by default. |
| `VITE_LEAD_NOTES_FILES_ENABLED` | Name absent from Production inventory; code enables only on exact `true` | Off by default. |
| `VITE_BYODB_ENABLED` | Name absent from Production inventory; code enables only on exact `true` | Off by default. |
| `VITE_STAGING_LEAD_STATUS_WRITES` | Name absent from Production inventory; code enables only on exact `true` and staging target | Off by default. |
| `APP_IMPORT_WORKER_ENABLED` | Name present; server-side value intentionally not read | **Unknown** from the permitted name-only Vercel inventory. |
| `APP_INVITE_WORKER_ENABLED` | Name present; server-side value intentionally not read | **Unknown** from the permitted name-only Vercel inventory. |
| `APP_AUTH_RECOVERY_ENABLED` | Name present; server-side value intentionally not read | **Unknown** from the permitted name-only Vercel inventory. |

## Required follow-up

1. Obtain a fresh Production migration-history and schema/policy/grant snapshot through the approved project-scoped read-only `supabase-ci` MCP. Include the project identity and capture time; do not query customer rows.
2. Keep `VITE_PILOT_WRITES` false. The new Production bundle verifies this; do not re-enable it until a human approves a specific production write contract and the production schema, RLS, grants, and migration state are reviewed. Vercel reported the setting across Production and Preview; check Preview's effective flag before its next deployment if that environment needs the pilot writer.
3. Configure Stripe only after human approval of the Production billing and legal release. Email and intake still require synthetic end-to-end acceptance; this report verifies names only.

## Change and no-database-write attestation

No Supabase query, migration, RPC, or database write was performed. The user subsequently instructed that `VITE_PILOT_WRITES` be turned off; that one Vercel environment setting was changed and the latest Production deployment was rebuilt to make the client-side setting effective. No other environment variable was intentionally changed.
