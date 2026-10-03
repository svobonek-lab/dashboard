# StavbaFlow work plan

## Objective

Deliver the first controlled pilot for a small construction company: owner login, employee invitation and activation, public inquiry intake, assignment, status change, persistent audit history and CSV import, with strict isolation between companies.

## Verified foundation

- PR #61 implemented and verified the staging-backed pilot flow.
- PR #62 verified real invitation dispatch and hardened outbox claim, retry and idempotency behavior.
- CI passes 91 tests, TypeScript checking and the production build.
- A direct Auth/REST test and browser test proved two-company isolation, employee assignment scope, owner writes, employee status-only writes, audit history and persistence after logout/login.
- Public intake and CSV import/duplicate/rollback passed through the deployed Vercel Preview.
- The current protected PR Preview was reconfigured with branch-scoped staging variables and rechecked: CSV dry-run/commit/idempotent retry/rollback passed, and a cross-company invitation attempt returned 403 without creating an invitation or Auth user.
- Supabase Security Advisor reports only the two intentional anonymous public intake functions on staging. Both have a fixed search path and no `authenticated` execution grant.
- Production Supabase was not written or migrated during pilot verification.

## Remaining release gates

1. The recipient opens the delivered real-mail invitation so the exact provider email link, redirect, confirmation and final membership activation can be observed.
2. Review the production metadata and proposed release changes separately. Do not copy the staging schema or configuration into production automatically.
3. Decide whether optional business email notifications will be enabled. They require an explicitly configured and verified provider.
4. Enable leaked-password protection when the selected Supabase plan supports it; the current staging Free plan reports it as unavailable.
5. Record the customer-specific onboarding result using `docs/pilot-operator-runbook.md` before describing that customer as live.

## Explicitly outside the pilot

- Google Sheets synchronization;
- direct customer SQL credentials or browser-side database connections;
- Synology synchronization;
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
