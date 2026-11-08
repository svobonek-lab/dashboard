# StavbaFlow production release evidence — 2026-11-08

This is a read-only release review. No production database, Vercel setting, or deployment was changed. It is **not** an authorization to deploy or enable writes.

## Exact deployed revision

Vercel project `dashboard` showed the following Production Deployment on 2026-11-08:

| Item | Observed value |
| --- | --- |
| Production alias | `https://dashboard-tau-snowy-61.vercel.app/` |
| Immutable deployment URL | `https://dashboard-l1i1tzhxt-svobonek-6462s-projects.vercel.app/` |
| Vercel deployment ID | `Hcp3VQDW2dbbvN1vNLEEMeT3xDou` |
| Git branch and commit | `main` at `7b9d6dca79a7a99360eaabfc383fdd0e00a02b00` (PR #174) |
| Vercel status | Ready |

Source: [Vercel project overview](https://vercel.com/svobonek-6462s-projects/dashboard), [exact deployment](https://vercel.com/svobonek-6462s-projects/dashboard/Hcp3VQDW2dbbvN1vNLEEMeT3xDou), and [GitHub commit](https://github.com/svobonek-lab/dashboard/commit/7b9d6dca79a7a99360eaabfc383fdd0e00a02b00). `Ready` establishes that Vercel built and served the deployment, not that authenticated routes or database contracts work.

The production HTML returned 200 and referenced `/assets/index-8pzv_D3A.js` on the current alias. This is the public client bundle inspected below. The alias and commit must be checked again immediately before any release because they may move.

## Effective release gates

The [Vercel Production variable inventory](https://vercel.com/svobonek-6462s-projects/dashboard/settings/environment-variables) currently lists project variables `VITE_PILOT_WRITES`, `INTAKE_HASH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `AI_INBOX_SIGNING_SECRET`, and `APP_IMPORT_WORKER_ENABLED`. No shared variables are linked to this project. This is a current name/scope inventory, not a claim about the values baked into the existing deployment. Vercel requires email re-verification to reveal even a Config value; no code was requested or entered.

| Gate | Evidence | Conclusion |
| --- | --- | --- |
| Pilot browser writes | Current deployed public bundle contains materialized `VITE_PILOT_WRITES=false`; `src/shared/api/pilotWritePolicy.ts` also requires the isolated staging Supabase URL. | **Off in the current Production bundle.** Keep off until a separately approved production write contract, schema/RLS/grant reconciliation, and release decision. The Vercel setting may have changed since this build; verify the next bundle again. |
| Production app reads | Bundle contains `VITE_APP_SCHEMA_READS=true`. | Client read gate on; this does not validate RLS. |
| BYODB browser mode | No `VITE_BYODB_ENABLED` Production variable name; code enables only on exact `true`. No materialized enabled value was observed in the public bundle. | Off by current configuration evidence. Do not advertise customer database installation as released. |
| BYODB server writes | No `ENABLE_BYODB_WRITES` Production variable name; `api/_connector/routes/operations.ts` requires exact `true`. | Off by current configuration evidence. |
| Import commit | `APP_IMPORT_WORKER_ENABLED` is Production-scoped, but its value is masked. `api/import-leads.ts` additionally requires the target URL to equal the StavbaCore Staging URL. | Configured boolean is **unknown**. A non-staging target is denied by the checked-in code; runtime binding and exact response were not tested. Keep the release gate closed until verified. |
| Paid self-registration | No `VITE_PAID_REGISTRATION_ENABLED` Production variable name; code requires exact `true`. | Off by current configuration evidence. |

No secret values, Supabase keys, or customer rows were read or copied into this report. A public bundle inspection proves only the JavaScript served by the observed deployment, not server-side values.

### Configuration differences to resolve in a later release

The current Production name inventory has no `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER_ID`, `STRIPE_PRICE_GROWTH_ID`, `STRIPE_PRICE_PRO_ID`, or `PUBLIC_APP_URL`. Production paid checkout and return URLs cannot be certified from this deployment. The billing code requires the Stripe secret, webhook secret, and price IDs for the plans offered. Set these only in a separately approved billing release after the legal and merchant prerequisites are ready.

For email, `RESEND_API_KEY`, `EMAIL_FROM`, and `CRON_SECRET` are present by name; the worker accepts `RESEND_API_KEY` as a fallback for `EMAIL_PROVIDER_API_KEY`. `EMAIL_LINK_ENCRYPTION_KEY` and `PUBLIC_APP_URL` are absent by name. This is not proof of deliverability or safe invitation links. `INTAKE_HASH_SECRET` is present by name, but its value and the deployed public-intake behavior were not tested. The current inventory also does not list `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY`; old deployments may still contain values captured at build/deploy time, so name absence does not prove the currently served app has no connection.

## Fresh production database metadata: read-only comparison

At **2026-11-08 08:48:23 UTC**, a project-scoped Supabase personal access token with **Database Read** and **Migrations Read** permissions was used only through the repository-approved `supabase-ci` endpoint (`project_ref=oncmtmrhmjlerbwkrecv`, `read_only=true`). The read-only MCP returned `list_tables`, `list_migrations`, and `execute_sql` results. SQL selected only `pg_catalog` and `information_schema` metadata: tables, columns, constraints, indexes, triggers, RLS/policies, grants, and function signatures/security/execute grants. No customer table rows, Auth users, secret values, function bodies, or Storage objects were queried. The full transient snapshot stays outside the repository; this report records only the comparison needed for review. A token response was visible in a local tool trace; revoke this short-lived token after this audit and do not reuse it.

The approved snapshot identifies **27 public `app_*` base tables**, all with RLS enabled; three platform tables also have FORCE RLS. It lists 27 public app policies and five `storage.objects` policies. Tenant-boundary policies on `app_companies`, `app_invites`, `app_lead_events`, `app_lead_files`, `app_lead_notes`, `app_leads`, and `app_members` are restrictive for `authenticated`. The Storage policy inventory includes restrictive anonymous/JWT boundaries and scoped authenticated select/insert/delete policies. Direct app-table grants to `anon` were absent; `authenticated` had grants only on those seven tenant-facing tables. This is **metadata evidence, not a live A/B isolation test**. Function bodies, Auth Dashboard hook selection, Storage bucket settings, and effective permissions through inherited roles were not checked.

The migration history exposed **13 versions**, from `20260930175248` through `20261015192519`. None of the **17** timestamp versions in `supabase/migrations/` appears under the same version in that history. This means **not recorded under the repository version**, not proof that every SQL effect is absent: objects may have been created or changed manually or under differently named migrations. Do not replay the historical files or mark them as safely pending based on version mismatch.

Unmatched repository versions: `20260911000000`, `20260911000001`, `20260911000002`, `20260911000003`, `20260911000004`, `20260912000000`, `20260916000000`, `20260917000000`, `20260919000000`, `20260920000001`, `20261025000000`, `20261026000000`, `20261027000000`, `20261031185027`, `20261101131053`, `20261101140813`, `20261101144114`. The production history reported `bootstrap_stavbaflow_staging_contract` and other names containing `staging`; those names alone do not establish which environment the SQL targeted.

| Repo contract or runtime call | Fresh production metadata | Release interpretation |
| --- | --- | --- |
| `20261025000000_secure_jwt_auth_hook.sql` | `public.app_tenant_access_token_hook(jsonb)` and `app_private.jwt_tenant_id()` exist. The hook is SECURITY DEFINER and its tested execute grant is limited to `supabase_auth_admin`; the JWT reader is executable by `authenticated`. Production has 27 `app_*` tables; this SQL preflight expects exactly 19. | **Different.** The migration would fail its table-count preflight. Hook body and Auth hook selection remain unobserved; do not apply or replace it blindly. |
| Lead notes/files and Storage | `app_lead_notes` and `app_lead_files` exist with RLS and tenant policies. Five `storage.objects` policies include the lead-file boundaries. | **Objects present.** Exact bucket configuration and end-to-end upload/download behavior remain unverified. Do not describe these tables as missing. |
| `20261026000000_public_intake_rate_limit.sql` | `app_public_intake_events` exists, but `client_ip_hash` and index `app_public_intake_company_ip_created_idx` do not. Live `app_submit_public_lead` has eight arguments; repo proposal has nine including `p_client_ip_hash`. | **Different.** Rate-limit proposal is not evidenced in the live contract. Public intake must not be certified abuse-resistant from source alone. |
| `20261027000000_app_email_outbox_runs.sql` | `app_email_outbox` exists; `app_email_outbox_runs` does not. | **Different.** Worker run evidence and scheduler behavior remain unverified. |
| `supabase/staging/20260930_import_worker.sql` and `api/import-leads.ts` | Live `app_import_leads` has four arguments; API code sends five, including `p_actor_id`. | **Different.** A production import commit against this signature would fail. Current code also requires an exact staging URL for commit; retain that safety gate. |
| `20261101131053_three_tier_monthly_plans.sql`, `20261101140813_three_tier_company_plan_check.sql` | `app_companies` has `plan` and `subscription_status`, but no `app_companies_plan_check`. Live `app_prepare_paid_registration` has six arguments; repo plan proposal has seven. | **Different.** Do not expose production self-service billing/registration until the plan contract is reconciled and tested. |
| `20261101144114_employee_seat_limits.sql` | The proposed `app_private.enforce_employee_seat_limit()` function, member/invite partial indexes, and seat-limit triggers were absent from inspected metadata. | **Different.** Do not claim database-enforced seat limits. |
| Stripe rebind `20261031185027_allow_canceled_stripe_subscription_rebind.sql` | `app_apply_stripe_subscription_event` has a compatible exposed signature; repository migration version is absent from history. Function body was not inspected. | **Not observable** whether behavior matches. Signature alone cannot prove canceled-subscription rebinding. |
| BYODB/connector staging contracts | Eight additional connector/BYODB tables are present beyond the old 19-table matrix. BYODB RPC signatures exist with service-role-only execute grants among tested roles. | **Partial match.** Table presence and grants do not prove connector digest, source-write behavior, or customer acceptance. |

These differences require a **new, narrowly reviewed reconciliation plan**, not an automatic migration. First compare function bodies, exact policy expressions, bucket settings, Auth hook configuration, scheduler configuration, and historical deployment records with a separately authorized metadata-only method where the approved MCP does not expose them. Test proposed SQL in disposable PostgreSQL and isolated staging; preserve existing migration history. Then present exact SQL hashes and a rollback plan for separate human approval. Production remains read-only in this task.

### Superseded assessment from before the approved snapshot

The earlier report treated current production schema and migration status as unknown because approved MCP authorization was unavailable. The fresh comparison above supersedes that uncertainty; its remaining gaps are explicitly identified. The [2026-10-25 matrix](security/app-rls-table-matrix.md) remains historical context only.

## One reviewable release sequence

1. **Evidence gate:** Review the fresh comparison above, close its explicit gaps through approved metadata-only inspection, and recheck the Vercel alias/deployment/commit before release. Resolve masked Config booleans through an authorized, non-secret effective-state check; do not print secrets. Revoke the temporary audit token after review.
2. **Change list:** Derive a minimal migration and configuration diff for each verified mismatch. Put code/documentation and proposed SQL in one scoped PR, with per-object preflight, rollback, and staging test evidence. Do not apply SQL automatically or enable `VITE_PILOT_WRITES`, import commit, BYODB writes, paid registration, or Stripe production billing as a side effect.
3. **Acceptance gate:** Verify the exact candidate commit in isolated staging with synthetic accounts: login/roles, A/B isolation, public intake, invitation/outbox, billing webhook/access, and BYODB connector digest if BYODB is to be released. Record failures and skipped cases. A passing CI job alone is insufficient.
4. **Human release decision:** Present the exact PR diff, metadata comparison, target Vercel settings by **name and intended state**, migration hashes, rollback, staging evidence, and customer impact. Seek separate approval for any production deployment or migration. This report supplies no such approval.
5. **After approved deployment:** Confirm the new production alias, deployment ID, and commit; then test the legacy `/widget-iframe.html?tenant=<synthetic-or-approved-key>` redirect preserving the tenant parameter and its intended no-key state, the `/register-paid` text/disabled state, and an unknown route's not-found page. Use read-only navigation and no customer writes. If behavior differs, rollback or reopen the release gate.

The route and copy fixes already exist on `main`: `vercel.json` redirects `/widget-iframe.html`, `src/app/App.tsx` handles unknown paths, and `PaidRegistration.tsx` gates registration. Their presence in source is **not** post-deployment acceptance of the exact legacy URL, tenant parameter, or rendered text.
