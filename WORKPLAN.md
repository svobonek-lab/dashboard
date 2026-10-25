# StavbaFlow work plan

## Objective

Deliver the first controlled pilot for a small construction company: owner login, employee invitation and activation, public inquiry intake, assignment, status change, persistent audit history and CSV import, with strict isolation between companies.

## Verified foundation

- PR #61 implemented and verified the staging-backed pilot flow.
- PR #62 verified real invitation dispatch and hardened outbox claim, retry and idempotency behavior.
- CI passes 101 tests, TypeScript checking and the production build.
- A direct Auth/REST test and browser test proved two-company isolation, employee assignment scope, owner writes, employee status-only writes, audit history and persistence after logout/login.
- Public intake and CSV import/duplicate/rollback passed through the deployed Vercel Preview.
- The real employee account is active, can be assigned by the owner and the assignment persists after reload.
- PR #65 fixes owner assignment, hides unverified pilot surfaces and keeps public intake anonymous even when an owner is signed in.
- The current protected PR Preview was reconfigured with branch-scoped staging variables and rechecked: CSV dry-run/commit/idempotent retry/rollback passed, and a cross-company invitation attempt returned 403 without creating an invitation or Auth user.
- Supabase Security Advisor reports only the two intentional anonymous public intake functions on staging. Both have a fixed search path and no `authenticated` execution grant.
- Production Supabase was not written or migrated during pilot verification.

## Remaining release gates

1. Verify the exact merged PR #65 deployment in a browser.
2. Rotate the staging service-role key before any real customer data is introduced.
3. Review the production metadata and proposed release changes separately. Do not copy the staging schema or configuration into production automatically.
4. Decide whether optional business email notifications will be enabled. They require an explicitly configured and verified provider.
5. Merge and deploy the honest pilot sales page, configure a real business contact path and add the public legal identity.
6. Enable leaked-password protection when the selected Supabase plan supports it; the current staging Free plan reports it as unavailable.
7. Record the customer-specific onboarding result using `docs/pilot-operator-runbook.md` before describing that customer as live.
8. Review and apply the proposed connector contract to isolated staging, run `test:connector:staging` and `test:connector:preview`, and record the tested image digest before enabling `VITE_CONNECTOR_ENABLED`.
9. Review and manually apply `supabase/staging/20261005_platform_admin_contract.sql` to isolated staging, then run the dry-run-first platform administrator provisioner for the existing operator Auth account.
10. Verify the platform administrator login and minimal company directory in the exact Preview. Owner and employee sessions must receive `403`, and the administrator must remain unable to read tenant business rows.
11. Configure `VITE_DEMO_URL` on the landing deployment to the verified dashboard `/demo` URL and repeat browser navigation checks.

## Read-only database connector

- Implemented: local Synology runtime, PostgreSQL/MySQL/MariaDB/SQL Server read-only adapters, signed tenant-bound protocol, durable cursor/outbox, explicit mapping, dry-run approval, owner controls, multi-architecture CI and digest rollback scripts.
- Reviewable only: `supabase/staging/20261004_connector_contract.sql`; it is not an applied migration and CI never applies it.
- PR #112's connector hardening and database-adapter CI passed on 2026-10-25 (Actions run 40187857992). This proves the code and synthetic source adapters, not a connection to a company database.
- The connector release list was empty on 2026-10-25. There is no published image digest to install yet.
- The owner UI describes the customer database as an optional, read-only addition. The connector remains disabled until `VITE_CONNECTOR_ENABLED` is deliberately enabled in a reviewed deployment.
- Before image publication: review and manually apply the staging-only connector contract to the isolated staging project; configure the staging-only synthetic accounts and Preview URL; run `connector-staging-acceptance` from `main`. The image publisher requires a successful run for the exact main commit and publishes the install bundle with its immutable digest.
- Before enabling a customer deployment: install the reviewed digest on a staging NAS, connect a synthetic database with a SELECT-only account, prove heartbeat, dry run, approved import, replay/idempotency, failure recovery, and tenant isolation in the exact Preview. Do not send customer credentials through chat or store them in Vercel/Supabase.
- The first real company setup still needs that company's reachable SQL endpoint, a customer-managed read-only database user, explicit table/field mapping, and a private NAS secret file. Until the staging and customer acceptance steps are recorded, the connector is not a sellable or live integration.

The repository now contains a staging-only provisioning command with dry-run-by-default behavior. It remains unverified for a new synthetic tenant until the staging service-role key is rotated and the operator runs the full checklist.

The platform-control-plane implementation is also reviewable in code: it uses a separate UUID registry, server-side authorization, a minimal company directory, and no tenant RLS bypass. It is not active until its SQL contract is manually reviewed/applied and the operator is explicitly provisioned in staging. See `docs/platform-admin-runbook.md`.

## Explicitly outside the pilot

- Google Sheets synchronization;
- direct customer SQL credentials or browser-side database connections;
- bidirectional synchronization back to a customer's database;
- automatic production migrations or deploys;
- auto-merge.

Unsupported integrations must fail honestly and must never return demonstration records or a successful-looking connection.

## Completion evidence

The pilot is complete only when all of the following are true in the intended environment:

- owner login and role routing work;
- the employee invitation is received, used once and cannot be reused after expiry or acceptance;
- the employee sees only assigned jobs and can change only permitted lifecycle fields;
- the public form creates exactly one tenant-scoped inquiry for an idempotency key;
- CSV import retry creates no duplicates and rollback refuses edited records;
- company B cannot read or mutate company A data through browser or direct API requests;
- logout, new login and recovery preserve the correct role and data;
- `npm ci`, `npm test`, `npm run lint` and `npm run build` pass;
- the Vercel deployment and browser smoke test pass;
- the security advisor and metadata grant review contain no unexplained findings.
