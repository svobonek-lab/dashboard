# StavbaFlow BYODB staging readiness

**Checked:** 2026-10-27. **Scope:** existing StavbaCore Staging and the branch Preview only. Production and customer databases were not written or queried for customer rows.

## Confirmed and reported state

- Staging ref is `xwzweltjvreqhjpbjrxa`; the production ref is `oncmtmrhmjlerbwkrecv`.
- The owner ran the saved metadata-only SQL status query; I inspected its open StavbaCore Staging result and confirmed all seven checks are `true`: the JWT hook function, connector mapping table, BYODB settings/operations tables, context/projection RPCs, and tenant claim reader.
- I inspected Authentication → Hooks in StavbaCore Staging. The dashboard lists the Customize Access Token hook as **ENABLED**, with schema `public` and function `app_tenant_access_token_hook`. The read-only Auth Management API snapshot still needs to confirm this alongside table RLS, grants, and RPC signatures.
- GitHub Actions has the staging URL/ref, publishable key, and three synthetic owner/employee account pairs configured. Secret values were not read.
- Vercel Preview variables for branch `codex/real-company` include `CONNECTOR_SECRET_ENCRYPTION_KEY`, staging `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Values remained masked and were not read.
- `VITE_BYODB_ENABLED`, `VITE_CONNECTOR_IMAGE`, and `ENABLE_BYODB_WRITES` are not present in that branch's Preview variable list. They should remain off until acceptance and immutable image release evidence exist.

## Acceptance blocker

GitHub Actions runs `40539439427`, `40539877306`, `40540852195`, `40543958525`, and `40544615710` failed before any workflow step started. The job annotation says the job could not start because recent account payments failed or the spending limit must be increased. Runner ID was `0` and the job had no steps. These are not staging or application test failures. The connector-staging-acceptance run therefore has no result. On run `40544615710`, both Vercel Preview checks succeeded; all GitHub-hosted jobs still had no runner or steps.

Local verification on the PR #127 work branch passed `npm test` (417/417), `npm run lint`, and `npm run build`. The owner connector setup now blocks enrollment creation until the configured image is an immutable GHCR digest, avoiding short-lived enrollment codes that cannot be installed. Its targeted regression test passed. Connector unit tests passed 83/83 active cases. The six PostgreSQL/MariaDB/SQL Server adapter fixture cases initially skipped because Docker's Linux engine was not running.

After the 2026-10-27 Windows restart, Docker Engine 29.9.2 started. Disposable PostgreSQL, MariaDB and SQL Server fixtures became healthy, SQL Server initialization succeeded, and `RUN_DB_INTEGRATION=1 npm run test:integration --prefix connector` passed twice (22/22, zero skips both times). The six previously skipped cases are now locally verified. `docker compose -f connector/compose.test.yaml down -v` removed the synthetic containers and network; Docker Desktop remains running. This does not replace staging acceptance or image release evidence.

The expanded operational source-write fixture suite also passed twice (26/26, zero skips) on disposable PostgreSQL, MariaDB and SQL Server. It covers employee and project create, idempotent replay, version-checked update, stale conflict and delete against limited writer accounts. The first run exposed PostgreSQL primary-key discovery through `information_schema` under a SELECT-only account; the adapter now reads primary-key metadata from `pg_catalog`. Root tests passed 420/420, and root/connector lint and connector build passed. These are local fixture results, not proof of a staging installation.

## Product scope still requiring a release decision

The current BYODB repository uses the company database as source of truth only for the mapped company profile and lead records. Employees, projects, lead notes, and files still use the existing StavbaFlow cloud repository. This is a hybrid connection, not a full replacement of every application's data store. The owner setup flow and SQL contracts do not currently define mappings for those other entities.

The staging Preview tab was also checked while signed out: it showed the login page, so authenticated owner UI behavior could not be independently exercised in this browser session. The automated acceptance workflow must perform that check using its synthetic staging credentials after Actions billing is restored.

## Implemented versus live-verified

| Area | Implemented evidence | Live/release status |
| --- | --- | --- |
| SQL source adapters | PostgreSQL, MySQL, MariaDB and SQL Server adapters; connector suite passes 83 unit tests. | Six DB fixture tests passed twice on local disposable PostgreSQL, MariaDB and SQL Server after restart. No customer DB has been connected. |
| Owner enrollment and NAS package | Owner UI/API, HMAC identity, and digest-pinned Synology package generator are covered by tests. | Enrollment is now blocked in the UI until an immutable image digest exists. No image is released. |
| Schema scan, mapping and dry run | Connector metadata schema, mapping validation, dry-run and approval flows exist in code and tests. | Not exercised against an actual connected SQL source in staging. |
| BYODB record reads and writes | Tenant-bound company-profile and lead projections plus queued, version-checked source writes have code and unit/contract tests. | No live source write/read acceptance has run; feature flags remain off. |
| Tenant isolation | Two-company/employee acceptance scripts and the read-only schema/grant preflight are in the workflow. | Workflow cannot start until GitHub Actions billing is fixed. |
| Synology installation | Compose templates, install/update scripts and operator documentation are present. | No published digest or installed customer NAS exists. |

## Next sequence

1. Restore GitHub Actions billing or raise the spending limit; this requires an account owner and may incur charges.
2. Retry the read-only staging metadata preflight and confirm the Auth hook is enabled with the expected function.
3. Run `connector-staging-acceptance` from `main`: owner setup Playwright, owner/employee/company isolation checks, and the staging Preview API check.
4. Publish the connector only with the successful acceptance run for the exact `main` commit; record its immutable image digest.
5. Configure the branch Preview image and feature gates only after reviewing that evidence. Keep customer production rollout gated until a reachable source database, least-privilege accounts, reviewed mapping, and NAS recovery checks are available.

The acceptance workflow was strengthened on the current work branch to check required connector/BYODB metadata, RLS, direct grants, and the enabled Auth hook through a read-only snapshot before running the UI and isolation checks. It does not apply SQL or read customer rows.
