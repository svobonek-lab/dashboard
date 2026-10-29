# Load test results

Thresholds are fixed by the acceptance prompt: reads p95 `< 800 ms`, writes p95 `< 1500 ms`, and unexpected error rate `< 1%`. Do not change them to make a run pass.

## Current status

**NOT RUN.** No current staging load run has been recorded. There is no evidence here for any percentile or error-rate threshold. On 2026-10-28, both scripts passed `k6 inspect` in the official Docker image. An earlier `setup()` run correctly refused a production-backed Preview. A later read-only `setup()` against `codex/staging-preview-safety` passed the staging target check and stopped at the missing private owner/employee fixture files. It made two GET requests, with no virtual-user iteration, public intake POST, CSV request, or lead write. k6's zero-sample threshold rows are not load results.

PR #142 now includes a staging-only provisioner for 30 owner and 100 employee identities and an opt-in, one-shot local-runner load job. The job verifies the deployed Preview bundle before any fixture write, creates and cleans two smoke fixtures, creates the private 130-user fixture set, runs k6, and cleans only the run's synthetic IDs even if k6 fails. This is automation preparation; it is not evidence that the live load run passed. The public-intake run remains conditional on the reviewed staging intake contract being enabled.

The owner status-change and teardown requests now use the staging-approved `app_change_lead_status` RPC; they no longer issue direct `PATCH` requests to `app_leads`. A regression test covers this contract. This fixes the script contract only; no load run or percentile result is implied.

| Scenario | Target profile | Result | Notes |
|---|---:|---|---|
| Owner and employee workspace | 30 owners + 100 employees, 10 minutes | NOT RUN | Requires 130 separate synthetic identities, distinct company IDs, access tokens and lead IDs. Each fixture includes `userId` and expected `role`; the script matches JWT `sub` and `app_metadata.tenant_id`, rejects duplicate users/tokens/tenants/leads, and confirms an active `app_members` row with the expected role before load begins. Prefer private JSON files outside version control via `STAGING_OWNER_LOAD_FIXTURES_FILE` and `STAGING_EMPLOYEE_LOAD_FIXTURES_FILE`; small local runs may use the JSON env variants. |
| Public intake | 200 requests in 1 minute | NOT RUN | Uses one Vercel-origin client IP, so configured rate-limit responses (429) are expected and counted separately from server errors. |

## Required run evidence

For every run, record UTC start/end, Preview deployment URL and commit, staging Supabase project ref, sanitized fixture-set identifier, VU/arrival profile, read/write p95, unexpected error rate, dropped iterations, public accepted/429 counts, and a list of threshold failures. Never store bearer tokens, passwords, raw IPs, customer data, or CSV rows here.

Fixture files are JSON arrays containing `accessToken`, `companyId`, `userId`, `role`, `leadId`, and `restoreStatus` for each VU. Keep them in the ignored `.local-load-fixtures/` directory or another access-restricted location; never commit, upload as artifacts, print, or paste their contents into chat. Set only the matching `*_FILE` variable or `*_JSON` variable for each fixture set, not both.

Owner VUs change status on their dedicated synthetic leads and restore those owner leads in `teardown`; the script does not status-write employee fixtures because employee transitions are forward-only. Employee VUs exercise authenticated dashboard and assigned-lead reads. The run still creates owner-lead audit/revision history. Use only dedicated synthetic fixtures and account for that history when preparing the next run.

Both scripts accept only a distinct HTTPS deployment matching the known Dashboard Preview project domain `dashboard-<deployment>-svobonek-6462s-projects.vercel.app`, validate the staging Supabase URL against its declared project ref, and inspect the deployed JavaScript for the staging ref before load begins. This prevents sending staging bearer tokens or public intake keys to a production-backed Preview or another Vercel project.

## Outstanding issues

- **LOAD-1:** Run the prepared staging-only provisioner and verify that all 130 private fixtures are created and removed; code and local guard tests alone do not prove the live staging lifecycle.
- **LOAD-2:** Confirm the exact staging Preview supports authenticated `app_leads` status writes for synthetic owners and assigned-lead reads for employees. The load script fails closed on a denied/zero-row owner write and verifies each employee's active membership before read traffic.
- **LOAD-3:** Run both scripts against the current staging Preview and record observed percentiles/counts. If a threshold fails, record the cause; do not relax the threshold.
- **LOAD-4 resolved (2026-10-28):** The `codex/staging-preview-safety` Preview now builds with StavbaCore Staging. The stable URL is `https://dashboard-git-codex-staging-prev-1738c7-svobonek-6462s-projects.vercel.app`; `STAGING_PREVIEW_URL` points there. The deployed login request reached the staging Supabase host in a Playwright probe, and the k6 preflight passed. The remaining blocker is the 130 private fixtures, not the Preview target.
