# StavbaFlow production release evidence — 2026-11-08

This is a read-only release review. No production database, Vercel setting, or deployment was changed. It is **not** an authorization to deploy or enable writes.

## Exact deployed revision

Vercel project `dashboard` showed the following Production Deployment on 2026-11-08:

| Item | Observed value |
| --- | --- |
| Production alias | `https://dashboard-tau-snowy-61.vercel.app/` |
| Immutable deployment URL | `https://dashboard-7j03z43to-svobonek-6462s-projects.vercel.app/` |
| Vercel deployment ID | `3ShtUJpT5BuMcUuBh7p36JCu49co` |
| Git branch and commit | `main` at `374c84fc5cf494bd6a29ca267b02d02dce688ec9` |
| Vercel status | Ready |

Source: [Vercel project overview](https://vercel.com/svobonek-6462s-projects/dashboard), [exact deployment](https://vercel.com/svobonek-6462s-projects/dashboard/3ShtUJpT5BuMcUuBh7p36JCu49co), and [GitHub commit](https://github.com/svobonek-lab/dashboard/commit/374c84fc5cf494bd6a29ca267b02d02dce688ec9). `Ready` establishes that Vercel built and served the deployment, not that authenticated routes or database contracts work.

The production HTML returned 200 and referenced `/assets/index-BEeW_Grl.js`. This is the public client bundle inspected below. The alias and commit must be checked again immediately before any release because they may move.

## Effective release gates

The [Vercel Production variable inventory](https://vercel.com/svobonek-6462s-projects/dashboard/settings/environment-variables) currently lists project variables `VITE_PILOT_WRITES`, `INTAKE_HASH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `AI_INBOX_SIGNING_SECRET`, and `APP_IMPORT_WORKER_ENABLED`. No shared variables are linked to this project. This is a current name/scope inventory, not a claim about the values baked into the existing deployment. Vercel requires email re-verification to reveal even a Config value; no code was requested or entered.

| Gate | Evidence | Conclusion |
| --- | --- | --- |
| Pilot browser writes | Exact deployed public bundle contains materialized `VITE_PILOT_WRITES=false`; `src/shared/api/pilotWritePolicy.ts` also requires the isolated staging Supabase URL. | **Off in the current Production bundle.** Keep off until a separately approved production write contract, fresh schema/RLS/grant proof, and release decision. The Vercel setting may have changed since this build; verify the next bundle again. |
| Production app reads | Bundle contains `VITE_APP_SCHEMA_READS=true`. | Client read gate on; this does not validate RLS. |
| BYODB browser mode | No `VITE_BYODB_ENABLED` Production variable name; code enables only on exact `true`. No materialized enabled value was observed in the public bundle. | Off by current configuration evidence. Do not advertise customer database installation as released. |
| BYODB server writes | No `ENABLE_BYODB_WRITES` Production variable name; `api/_connector/routes/operations.ts` requires exact `true`. | Off by current configuration evidence. |
| Import commit | `APP_IMPORT_WORKER_ENABLED` is Production-scoped, but its value is masked. `api/import-leads.ts` additionally requires the target URL to equal the StavbaCore Staging URL. | Configured boolean is **unknown**. A non-staging target is denied by the checked-in code; runtime binding and exact response were not tested. Keep the release gate closed until verified. |
| Paid self-registration | No `VITE_PAID_REGISTRATION_ENABLED` Production variable name; code requires exact `true`. | Off by current configuration evidence. |

No secret values, Supabase keys, or customer rows were read or copied into this report. A public bundle inspection proves only the JavaScript served by the observed deployment, not server-side values.

### Configuration differences to resolve in a later release

The current Production name inventory has no `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_ID`, `STRIPE_PRICE_GROWTH_ID`, `STRIPE_PRICE_PRO_ID`, or `PUBLIC_APP_URL`. Production paid checkout and return URLs cannot be certified from this deployment. The billing code requires the Stripe secret, webhook secret, and price IDs for the plans offered. Set these only in a separately approved billing release after the legal and merchant prerequisites are ready.

For email, `RESEND_API_KEY`, `EMAIL_FROM`, and `CRON_SECRET` are present by name; the worker accepts `RESEND_API_KEY` as a fallback for `EMAIL_PROVIDER_API_KEY`. `EMAIL_LINK_ENCRYPTION_KEY` and `PUBLIC_APP_URL` are absent by name. This is not proof of deliverability or safe invitation links. `INTAKE_HASH_SECRET` is present by name, but its value and the deployed public-intake behavior were not tested. The current inventory also does not list `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY`; old deployments may still contain values captured at build/deploy time, so name absence does not prove the currently served app has no connection.

## Production database metadata: required comparison, still unverified

`AGENTS.md` permits production metadata inspection **only** through the project-scoped, read-only `supabase-ci` MCP. `opencode.jsonc` pins that server to the StavbaFlow Production ref with `read_only=true`. The server is not connected in this session: `opencode mcp list` reports no configured servers, the local `SUPABASE_ACCESS_TOKEN` environment variable is absent, and the repository's self-hosted billing runner is offline. The generic Supabase connector, direct credentials, dashboard SQL, and application APIs are not substitutes. No new production metadata query was made.

The checked-in [2026-09-30 snapshot](production-schema-metadata.md) reports `app_*` tables and enabled RLS, but omits policy predicates, grants, function signatures, and migration history. The later [2026-10-25 approved-channel matrix](security/app-rls-table-matrix.md) records 19 catalog-listed `app_*` base tables, RLS flags, direct grants, 46 reported policies (only a subset rendered), and selected function metadata. It still omits complete policy predicates, function bodies/triggers, Auth Dashboard hook configuration, and migration history; it is also two weeks old. Neither snapshot establishes current production state. All 17 files currently under `supabase/migrations/` are therefore **not confirmed on Production**; this means unknown, not absent. Staging SQL under `supabase/staging/` is a separate proposal set and is not proof of production application.

Historical comparison against current repository contracts, **not a live rollout decision**:

| Contract | Observed on 2026-10-25 via approved channel | What remains unproved now |
| --- | --- | --- |
| Tenant/Auth boundary | `app_companies`, `app_members`, and `app_leads` had RLS; selected tenant policies and grants were rendered. `public.app_tenant_access_token_hook(jsonb)` existed with an execute grant for `supabase_auth_admin`. | Current predicates, complete policy inventory, function body, hook selection in Auth settings, and whether repo SQL exactly matches. Do not recreate the hook based on source assumptions. |
| Notes and attachments | `app_lead_notes` and `app_lead_files` appeared among the 19 tables with RLS and scoped grants/policies. | Current column/storage policy details and migration identity. Do not infer these objects are missing merely because a staging proposal exists. |
| Intake, outbox, import | `app_public_intake_events`, `app_email_outbox`, and `app_imports` were present with RLS; the rendered grants restricted browser access to the internal tables. | Current RPC signatures/grants, rate-limit details, worker scheduler, and complete policy predicates. |
| Stripe | `app_stripe_webhook_events` had RLS and no direct app-role table grants in the historical matrix. | Current subscription columns/RPC signatures, plan/seat-limit constraints, migration versions, and webhook behavior. |

The October matrix itself warns that generated counts and rendered rows disagree (20 claimed versus 19 named tables; 46 policies claimed versus a partial rendered set). Preserve those uncertainties in the new comparison rather than filling gaps by inference.

Before proposing any production migration or enabling writes, capture with the approved `supabase-ci` channel: project identity and UTC timestamp; table/column/type/default/nullability/constraint metadata; RLS enable/force flags and full policy definitions; schema/table/function privileges by role; function signatures, ownership, security mode, and execution grants; Storage bucket/policy metadata; and the migration-history versions/checksums. Do not query customer rows. If the approved channel cannot expose a category, record it as an explicit release blocker.

Compare that snapshot against these repository contracts, without inferring deployment from file presence:

| Contract group | Repo sources | Comparison required |
| --- | --- | --- |
| Core tenant data | `20260911000000_schema.sql` through `20260920000001_get_public_org_branding.sql`, plus the current `app_*` adapter | Tables, company keys, foreign keys, RLS predicates, grants, public branding RPC signatures. |
| Auth tenant boundary | `20261025000000_secure_jwt_auth_hook.sql` | Auth hook existence/configuration, `app_private.jwt_tenant_id()`, `public.app_tenant_access_token_hook(jsonb)`, policy predicates and execute grants. |
| Public intake | `20261026000000_public_intake_rate_limit.sql` | Rate-limit objects/functions, anonymous grants and tenant isolation. |
| Email outbox | `20261027000000_app_email_outbox_runs.sql` and reviewed staging invitation contracts | Tables/RPC signatures, worker grants, claim/retry behavior and actual scheduler configuration. |
| Billing and plans | `20261031185027_allow_canceled_stripe_subscription_rebind.sql` and three `20261101*` migrations | Subscription columns/constraints, Stripe RPC signatures/grants, plan and seat-limit contract. |
| BYODB/import | `supabase/staging/20261004_connector_contract.sql`, `20261025_byodb_operations.sql`, `20260930_import_worker.sql` | Determine whether each is deliberately staging-only; do not copy to Production without an independent reviewed migration and successful acceptance. |

For each object, record `matches`, `different`, or `not observable` with the exact approved snapshot reference. Do not write an "apply all" script: migration history and existing policies may differ. Any change requires a separate reviewed migration, disposable/staging verification, and explicit human approval.

## One reviewable release sequence

1. **Evidence gate:** Obtain the approved, fresh production metadata snapshot and complete the object-by-object comparison above. Recheck the Vercel alias/deployment/commit and Production variable names. Resolve masked Config booleans through an authorized, non-secret effective-state check; do not print secrets.
2. **Change list:** Derive the minimal migration and configuration diff from that comparison. Put code/documentation and proposed SQL in one scoped PR, with per-object preflight, rollback, and staging test evidence. Do not apply SQL automatically or enable `VITE_PILOT_WRITES`, import commit, BYODB writes, paid registration, or Stripe production billing as a side effect.
3. **Acceptance gate:** Verify the exact candidate commit in isolated staging with synthetic accounts: login/roles, A/B isolation, public intake, invitation/outbox, billing webhook/access, and BYODB connector digest if BYODB is to be released. Record failures and skipped cases. A passing CI job alone is insufficient.
4. **Human release decision:** Present the exact PR diff, metadata comparison, target Vercel settings by **name and intended state**, migration hashes, rollback, staging evidence, and customer impact. Seek separate approval for any production deployment or migration. This report supplies no such approval.
5. **After approved deployment:** Confirm the new production alias, deployment ID, and commit; then test the legacy `/widget-iframe.html?tenant=<synthetic-or-approved-key>` redirect preserving the tenant parameter and its intended no-key state, the `/register-paid` text/disabled state, and an unknown route's not-found page. Use read-only navigation and no customer writes. If behavior differs, rollback or reopen the release gate.

The route and copy fixes already exist on `main`: `vercel.json` redirects `/widget-iframe.html`, `src/app/App.tsx` handles unknown paths, and `PaidRegistration.tsx` gates registration. Their presence in source is **not** post-deployment acceptance of the exact legacy URL, tenant parameter, or rendered text.
