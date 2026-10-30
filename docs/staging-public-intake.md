# Staging public-intake acceptance

**Status: SQL applied and metadata-verified on StavbaCore Staging; live endpoint acceptance is pending.** Both SQL files below were applied after explicit approval to project `xwzweltjvreqhjpbjrxa`. Read-only metadata checks confirmed the event table, RLS, hardened intake RPC, and service-only execution grant. Synthetic Company A (`e2e-synthetic-company-a`) is enabled. Its `privacy_url` is `https://example.test/privacy` only to satisfy the staging table constraint; this is a reserved test placeholder, not company legal information. Production remains untouched.

## Reviewed SQL order

In the Supabase SQL Editor, first confirm the project header is **StavbaCore Staging** (`xwzweltjvreqhjpbjrxa`). Do not run these files against StavbaFlow Production.

1. Apply `supabase/staging/20261029_public_intake_events.sql`. It creates only the missing idempotency table, enables RLS, revokes direct access from browser and service roles, and adds a deny policy for `anon` and `authenticated`.
2. Apply `supabase/migrations/20261026000000_public_intake_rate_limit.sql`. It adds the lead link and hashed-IP columns, enforces five unique submissions per tenant/IP per ten minutes, and exposes only the bounded RPC to `service_role`. Do not use `supabase/staging/pilot_public_intake.sql`; its anonymous RPC grant bypasses the server proxy.
3. The synthetic A form has already been enabled after the two SQL files passed catalog and function privilege checks. The exact state is:

   ```sql
   update public.app_companies
   set public_form = true,
       privacy_url = 'https://example.test/privacy'
   where slug = 'e2e-synthetic-company-a'
     and active = true
   returning id, slug, public_form;
   ```

   The update returned exactly one synthetic company. If rolling back the test, set `public_form=false` for that exact synthetic slug; retain any synthetic test leads for auditability.

The staging Preview must be built from code that reads the server-only `INTAKE_HASH_SECRET`. The existing key is scoped to `codex/staging-preview-safety`. The approved `preview-configure` workflow mode creates a separate sensitive key for `codex/staging-e2e-local-runner`, if absent; it also installs the staging-only server credentials for that branch. Do not rename the hash secret to a `PUBLIC_` or `VITE_` variable. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side. A safe staging-target deployment with the current public-intake code has not yet been verified, so do not submit endpoint requests until its static bundle preflight proves it targets `xwzweltjvreqhjpbjrxa`.

## Disposable database evidence

PostgreSQL 17 applied the new bridge, the existing rate-limit migration, and `supabase/tests/public_intake_security_verify.sql` successfully. The test also started without `app_public_intake_events`, proving the bridge fills the known schema gap. The burst check completed 50 concurrent same-IP requests in 459 ms: five accepted and 45 returned rate-limited. Ten concurrent retries with one idempotency key returned one lead. No live staging or production SQL was applied during this verification.

## Still required for live acceptance

- Run `preview-configure` for the approved branch, then deploy the current code and confirm its static bundle targets staging before submitting endpoint requests.
- Run the Playwright idempotency and cross-company response checks, then the 200-request/one-minute k6 profile. Keep `docs/load-results.md` marked NOT RUN until actual staging measurements exist.
- Set GitHub Actions variable `STAGING_PUBLIC_INTAKE_ENABLED=true` after the current code is deployed and its bundle preflight verifies the staging project; the current E2E job skipped this scenario because the variable is unset.
- The earlier GitHub-hosted jobs could not allocate a runner because of the account spending limit. A single-use runner in the local Docker engine completed metadata-only run [41033508835](https://github.com/svobonek-lab/dashboard/actions/runs/41033508835) without GitHub-hosted minutes. The live endpoint acceptance is still pending.
