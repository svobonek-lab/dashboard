# Load test results

Thresholds are fixed by the acceptance prompt: reads p95 `< 800 ms`, writes p95 `< 1500 ms`, and unexpected error rate `< 1%`. Do not change them to make a run pass.

## Current status

**Owner/employee live staging load PASSED the specified thresholds on 2026-10-30. Public intake load is NOT RUN.** The [latest measured Actions run](https://github.com/svobonek-lab/dashboard/actions/runs/41022916645) used commit `b91d284c14b2bc5f0e910ac7c088f256ac334014`, the staging-only Preview `https://dashboard-git-codex-staging-prev-1738c7-svobonek-6462s-projects.vercel.app`, and StavbaCore Staging ref `xwzweltjvreqhjpbjrxa`. The k6 step ran from 08:02:13 to 08:12:27 UTC. Its private synthetic fixture set was `0f1ce5fd92be`. The workflow created 130 distinct synthetic identities, removed all 130, and twice recovered 0 remaining identities. The sanitized summary recorded 157,034 requests, 66,091 iterations, 156,872 passing checks and zero failed checks; read p95 was 261.20 ms, write p95 was 85.19 ms, `acceptance_errors` was 0, and `http_req_failed` was 0. The public-intake step was skipped because the live contract is not enabled.

Security correction: the original k6 summary artifact included `setup_data`, which contained bearer tokens for those synthetic users. Artifact `staging-load-summary-40934601833` was deleted from GitHub Actions on 2026-10-30. The synthetic Auth users had already been deleted and the staging recovery checks found no remaining identities. The current workflow writes only an allowlist of metric summaries to artifacts. The regression test rejects setup data and token strings, and artifact `staging-load-summary-41022916645` was inspected to confirm that it contains only the metric summary.

PR #142 includes a staging-only provisioner and an opt-in, one-shot local-runner load job. The job verifies the deployed Preview bundle before fixture writes, creates and cleans two smoke fixtures, runs k6 with private token files, and verifies cleanup. The public-intake run remains conditional on the reviewed staging intake contract being enabled.

The owner status-change and teardown requests now use the staging-approved `app_change_lead_status` RPC; they no longer issue direct `PATCH` requests to `app_leads`. A regression test covers this contract. This fixes the script contract only; no load run or percentile result is implied.

| Scenario | Target profile | Result | Notes |
|---|---:|---|---|
| Owner and employee workspace | 30 owners + 100 employees, 10 minutes | **PASSED all measured thresholds** | Latest run 41022916645: 66,091 iterations and 157,034 HTTP requests. Read p95 **261.20 ms** (<800 ms), write p95 **85.19 ms** (<1500 ms), acceptance errors **0/156,872 checks**, HTTP failure rate **0%**. 130 fixture identities removed; both recovery checks found 0. |
| Public intake | 200 requests in 1 minute | NOT RUN | Uses one Vercel-origin client IP, so configured rate-limit responses (429) are expected and counted separately from server errors. |

## Required run evidence

For every run, record UTC start/end, Preview deployment URL and commit, staging Supabase project ref, sanitized fixture-set identifier, VU/arrival profile, read/write p95, unexpected error rate, dropped iterations, public accepted/429 counts, and a list of threshold failures. Never store bearer tokens, passwords, raw IPs, customer data, or CSV rows here.

Fixture files are JSON arrays containing `accessToken`, `companyId`, `userId`, `role`, `leadId`, and `restoreStatus` for each VU. Keep them in the ignored `.local-load-fixtures/` directory or another access-restricted location; never commit, upload as artifacts, print, or paste their contents into chat. Set only the matching `*_FILE` variable or `*_JSON` variable for each fixture set, not both.

Owner VUs change status on their dedicated synthetic leads and restore those owner leads in `teardown`; the script does not status-write employee fixtures because employee transitions are forward-only. Employee VUs exercise authenticated dashboard and assigned-lead reads. The run still creates owner-lead audit/revision history. Use only dedicated synthetic fixtures and account for that history when preparing the next run.

Both scripts accept only a distinct HTTPS deployment matching the known Dashboard Preview project domain `dashboard-<deployment>-svobonek-6462s-projects.vercel.app`, validate the staging Supabase URL against its declared project ref, and inspect the deployed JavaScript for the staging ref before load begins. This prevents sending staging bearer tokens or public intake keys to a production-backed Preview or another Vercel project.

## Outstanding issues

- **LOAD-1 resolved (2026-10-29):** 130 private fixtures were created and removed in run `40934601833`; two recovery reads found 0 remaining. An earlier aborted run `40931290917` left 93 synthetic identities after partial cleanup; [recovery](https://github.com/svobonek-lab/dashboard/actions/runs/40933221098) removed those 93 and [verification](https://github.com/svobonek-lab/dashboard/actions/runs/40933898111) found 0. The runner was ephemeral, and no token file was uploaded.
- **LOAD-2 resolved:** The latest run verified an active tenant membership for every fixture and exercised owner status writes, employee reads, and 500-row CSV dry runs over ten minutes. All 156,872 acceptance checks passed; no failed check required attribution.
- **LOAD-3 partially resolved:** Owner/employee thresholds passed with zero measured acceptance and HTTP errors. The 200-request public intake run remains blocked until the reviewed staging intake contract is applied and enabled for a synthetic company.
- **LOAD-4 resolved (2026-10-28):** The `codex/staging-preview-safety` Preview builds with StavbaCore Staging. The stable URL is `https://dashboard-git-codex-staging-prev-1738c7-svobonek-6462s-projects.vercel.app`; `STAGING_PREVIEW_URL` points there. The deployed login request reached the staging Supabase host in a Playwright probe, and the k6 preflight passed before the measured run.
