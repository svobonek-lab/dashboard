# Load test results

Thresholds are fixed by the acceptance prompt: reads p95 `< 800 ms`, writes p95 `< 1500 ms`, and unexpected error rate `< 1%`. Do not change them to make a run pass.

## Current status

**Owner/employee and public intake live staging load passed on 2026-10-30.** The latest [Actions run](https://github.com/svobonek-lab/dashboard/actions/runs/41046254837) used commit `baa89ccfabb2301d876697f7cab6b36a03b36486`, the staging-only Preview `https://dashboard-3b5mmwl44-svobonek-6462s-projects.vercel.app`, and StavbaCore Staging ref `xwzweltjvreqhjpbjrxa`. Owner/employee k6 ran 10 minutes (11:20:58–11:31:10 UTC): 66,921 iterations, 159,132 HTTP requests, 158,970 passing checks and zero failed checks; read p95 was 243.48 ms, write p95 was 64.00 ms, `acceptance_errors` was 0%, and `http_req_failed` was 0%. Public intake sent 200 requests in one minute: 5 accepted, 195 rate limited, zero unexpected responses, and zero dropped iterations. The expected 429 responses count as HTTP failures in k6's generic `http_req_failed` metric, so the public endpoint result is represented by its dedicated accepted/rate-limited/unexpected counters. Exact-run cleanup removed the public leads and synthetic fixtures; the recovery step found 0 remaining identities.

Security correction: the original k6 summary artifact included `setup_data`, which contained bearer tokens for those synthetic users. Artifact `staging-load-summary-40934601833` was deleted from GitHub Actions on 2026-10-30. The synthetic Auth users had already been deleted and the staging recovery checks found no remaining identities. The current workflow writes only an allowlist of metric summaries to artifacts. The regression test rejects setup data and token strings, and artifact `staging-load-summary-41022916645` was inspected to confirm that it contains only the metric summary.

PR #142 includes a staging-only provisioner and an opt-in, one-shot local-runner load job. The job verifies the deployed Preview bundle before fixture writes, creates and cleans two smoke fixtures, runs k6 with private token files, and verifies cleanup. The public-intake run remains conditional on the reviewed staging intake contract being enabled.

The owner status-change and teardown requests now use the staging-approved `app_change_lead_status` RPC; they no longer issue direct `PATCH` requests to `app_leads`. A regression test covers this contract. This fixes the script contract only; no load run or percentile result is implied.

| Scenario | Target profile | Result | Notes |
|---|---:|---|---|
| Owner and employee workspace | 30 owners + 100 employees, 10 minutes | **PASSED all measured thresholds** | Run 41046254837: 66,921 iterations and 159,132 HTTP requests. Read p95 **243.48 ms** (<800 ms), write p95 **64.00 ms** (<1500 ms), acceptance errors **0%**, HTTP failures **0/159,132**. Exact-run synthetic fixtures removed; recovery found 0 remaining identities. |
| Public intake | 200 requests in 1 minute | **PASSED abuse/load counters** | Run 41046254837: **5 accepted**, **195 rate limited (429)**, zero unexpected responses, and zero dropped iterations. The Vercel-origin test naturally shares one client IP; expected 429s are not server errors. |

## Required run evidence

For every run, record UTC start/end, Preview deployment URL and commit, staging Supabase project ref, sanitized fixture-set identifier, VU/arrival profile, read/write p95, unexpected error rate, dropped iterations, public accepted/429 counts, and a list of threshold failures. Never store bearer tokens, passwords, raw IPs, customer data, or CSV rows here.

Fixture files are JSON arrays containing `accessToken`, `companyId`, `userId`, `role`, `leadId`, and `restoreStatus` for each VU. Keep them in the ignored `.local-load-fixtures/` directory or another access-restricted location; never commit, upload as artifacts, print, or paste their contents into chat. Set only the matching `*_FILE` variable or `*_JSON` variable for each fixture set, not both.

Owner VUs change status on their dedicated synthetic leads and restore those owner leads in `teardown`; the script does not status-write employee fixtures because employee transitions are forward-only. Employee VUs exercise authenticated dashboard and assigned-lead reads. The run still creates owner-lead audit/revision history. Use only dedicated synthetic fixtures and account for that history when preparing the next run.

Both scripts accept only a distinct HTTPS deployment matching the known Dashboard Preview project domain `dashboard-<deployment>-svobonek-6462s-projects.vercel.app`, validate the staging Supabase URL against its declared project ref, and inspect the deployed JavaScript for the staging ref before load begins. This prevents sending staging bearer tokens or public intake keys to a production-backed Preview or another Vercel project.

## Outstanding issues

- **LOAD-1 resolved (2026-10-29):** 130 private fixtures were created and removed in run `40934601833`; two recovery reads found 0 remaining. An earlier aborted run `40931290917` left 93 synthetic identities after partial cleanup; [recovery](https://github.com/svobonek-lab/dashboard/actions/runs/40933221098) removed those 93 and [verification](https://github.com/svobonek-lab/dashboard/actions/runs/40933898111) found 0. The runner was ephemeral, and no token file was uploaded.
- **LOAD-2 resolved:** The latest run verified an active tenant membership for every fixture and exercised owner status writes, employee reads, and 500-row CSV dry runs over ten minutes. All 158,970 acceptance checks passed; no failed check required attribution.
- **LOAD-3 resolved for the tested profiles (2026-10-30):** Owner/employee thresholds passed with zero acceptance/HTTP errors; 200 public requests produced 5 accepted and 195 expected rate-limited responses, zero unexpected responses, and zero dropped iterations. Results are in run `41046254837`. This is a staging acceptance result, not production capacity evidence.
- **LOAD-4 resolved (2026-10-30):** Run `41046254837` used a Preview bundle targeting StavbaCore Staging. The current `STAGING_PREVIEW_URL` points to the newer verified deployment `https://dashboard-38ejeqde7-svobonek-6462s-projects.vercel.app`; this URL was built after the measured load run to repair Sentry delivery. The k6 preflight passed before fixture writes and load on the recorded run target.
