# Load test results

Thresholds are fixed by the acceptance prompt: reads p95 `< 800 ms`, writes p95 `< 1500 ms`, and unexpected error rate `< 1%`. Do not change them to make a run pass.

## Current status

**NOT RUN.** No current staging load run has been recorded. There is no evidence here for any percentile or error-rate threshold. On 2026-10-28, both scripts passed `k6 inspect` in the official Docker image. Their real `setup()` runs against the configured Preview stopped after two read-only GET requests because its JavaScript targets production Supabase. No virtual-user iteration, public intake POST, CSV request, or lead write occurred. k6 displays threshold rows with zero samples for this aborted setup; those rows are not load results.

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

- **LOAD-1:** Provision 30 synthetic owner identities and 100 synthetic employee identities, with one distinct staging company/lead fixture per virtual user, without reusing production data.
- **LOAD-2:** Confirm the exact staging Preview supports authenticated `app_leads` status writes for synthetic owners and assigned-lead reads for employees. The load script fails closed on a denied/zero-row owner write and verifies each employee's active membership before read traffic.
- **LOAD-3:** Run both scripts against the current staging Preview and record observed percentiles/counts. If a threshold fails, record the cause; do not relax the threshold.
- **LOAD-4:** Deploy a current Preview whose compiled JavaScript uses StavbaCore Staging. The configured `codex/real-company` Preview and PR #133 Preview both compiled the production project ref, so the load preflight correctly rejects them.
