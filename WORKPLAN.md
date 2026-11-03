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
11. Configure `PUBLIC_APP_URL` and `PUBLIC_LANDING_URL` on both surfaces with approved custom HTTPS domains and repeat browser navigation checks.

## Customer-managed database connector (BYODB)

- Implemented on `codex/byodb-source-of-truth`: owner BYODB mode, company and lead field mapping, HMAC enrollment, tenant-scoped durable operations, parameterized SQL adapters for PostgreSQL/MySQL/MariaDB/SQL Server, separate source read/write accounts, version-conflict handling, and source-backed company/lead projections.
- Managed Cloud remains the default. BYODB is guarded by `VITE_BYODB_ENABLED` and server-side `ENABLE_BYODB_WRITES`; mapped company and lead writes do not fall through to Supabase. Public lead intake and CSV writes remain disabled in BYODB until a safe source-write contract exists.
- Reviewable SQL contracts: `supabase/staging/20261004_connector_contract.sql` and `supabase/staging/20261025_byodb_operations.sql`. The owner reports applying both to the existing isolated StavbaCore Staging project. I inspected the saved read-only status query: all seven checks are true. I also inspected Authentication → Hooks; `public.app_tenant_access_token_hook` is listed as ENABLED. A fresh Management API snapshot is still needed to verify table RLS, grants and RPC execution grants together.
- GitHub Actions has the separate staging URL/ref, publishable key and synthetic owner/employee credentials configured. The branch Preview `codex/real-company` has the server-side connector encryption key and staging Supabase variables; its BYODB/image release flags remain unset.
- No connector acceptance run has succeeded and no immutable image digest has been published. Attempts `40539439427`, `40539877306`, connector acceptance `40540852195`, PR verification `40543958525`, and metadata-preflight PR run `40544615710` were rejected before any job step because recent GitHub account payments failed or the Actions spending limit must be increased. This is an account billing blocker, not a test result.
- Draft PR #127 adds the read-only metadata preflight, prevents creating an expiring enrollment until Vercel provides an immutable connector digest, and discloses in the owner UI that only mapped company and lead data use BYODB for now; employees, projects, notes and files remain in StavbaFlow Cloud. Public intake, AI intake and CSV writes remain unavailable in BYODB.
- Do not create another Supabase project or use the production-shared project for acceptance. After GitHub Actions billing is restored, run the metadata preflight, owner UI Playwright, two-company/employee isolation checks, and staging Preview checks from `main`. Image publication requires successful evidence for the exact main commit.
- A customer rollout additionally requires a reachable SQL endpoint, separate least-privilege read and mapped-write accounts, approved company/lead maps, one unambiguous source company-profile row, and private NAS secret files. Never send customer credentials in chat.

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
