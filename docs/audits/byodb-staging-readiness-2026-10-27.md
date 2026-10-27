# StavbaFlow BYODB staging readiness

**Checked:** 2026-10-27. **Scope:** existing StavbaCore Staging and the branch Preview only. Production and customer databases were not written or queried for customer rows.

## Confirmed and reported state

- Staging ref is `xwzweltjvreqhjpbjrxa`; the production ref is `oncmtmrhmjlerbwkrecv`.
- The owner ran the saved metadata-only SQL status query and reported all seven checks as `true`: the JWT hook function, connector mapping table, BYODB settings/operations tables, context/projection RPCs, and tenant claim reader.
- The owner reported selecting and enabling `public.app_tenant_access_token_hook` in Authentication → Hooks. The Auth Management API snapshot has not been refreshed after that change, so enablement and URI are not yet independently confirmed.
- GitHub Actions has the staging URL/ref, publishable key, and three synthetic owner/employee account pairs configured. Secret values were not read.
- Vercel Preview variables for branch `codex/real-company` include `CONNECTOR_SECRET_ENCRYPTION_KEY`, staging `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Values remained masked and were not read.
- `VITE_BYODB_ENABLED`, `VITE_CONNECTOR_IMAGE`, and `ENABLE_BYODB_WRITES` are not present in that branch's Preview variable list. They should remain off until acceptance and immutable image release evidence exist.

## Acceptance blocker

GitHub Actions runs `40539439427`, `40539877306`, `40540852195`, and PR verification `40543958525` failed before any workflow step started. The job annotation says the job could not start because recent account payments failed or the spending limit must be increased. Runner ID was `0` and the job had no steps. These are not staging or application test failures. The connector-staging-acceptance run therefore has no result.

## Next sequence

1. Restore GitHub Actions billing or raise the spending limit; this requires an account owner and may incur charges.
2. Retry the read-only staging metadata preflight and confirm the Auth hook is enabled with the expected function.
3. Run `connector-staging-acceptance` from `main`: owner setup Playwright, owner/employee/company isolation checks, and the staging Preview API check.
4. Publish the connector only with the successful acceptance run for the exact `main` commit; record its immutable image digest.
5. Configure the branch Preview image and feature gates only after reviewing that evidence. Keep customer production rollout gated until a reachable source database, least-privilege accounts, reviewed mapping, and NAS recovery checks are available.

The acceptance workflow was strengthened on the current work branch to check required connector/BYODB metadata, RLS, direct grants, and the enabled Auth hook through a read-only snapshot before running the UI and isolation checks. It does not apply SQL or read customer rows.
