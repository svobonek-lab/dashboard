# Prompt acceptance status (1–8)

Status checked 2026-10-30. Production Supabase remains read-only. Live staging results are kept separate from local, disposable-Postgres, and Preview evidence.

| Prompt | Status | Evidence and remaining gate |
|---|---|---|
| 1. Owner and two tenants | **Staging owner flow passed** | After the approved import-worker SQL and staging Preview correction, run [41043623719](https://github.com/svobonek-lab/dashboard/actions/runs/41043623719) passed owner login, status update, CSV import/export, logout, tenant REST isolation, assignment, export, and intake idempotency. Exact synthetic imports were rolled back. |
| 2. Tenant isolation | **REST and assignment checks passed; Storage remains blocked** | Owner A and employee A could not access or change company B rows; owner B’s independent fixture remained visible. Private file download test is skipped because the prompt keeps the notes/files migration review-only and no file bucket/fixture exists. |
| 3. Schema and migrations | **Snapshot and drift CI check exist; live schema still differs** | Metadata snapshot [41033508835](https://github.com/svobonek-lab/dashboard/actions/runs/41033508835) records 30 relations, 318 columns, 56 policies, and 61 functions. Comparison reports unresolved drift in both migration folders. The CI guard fails on drift. Do not batch-apply legacy SQL. Notes/files migration remains a review-only draft; UI is gated and states “Přílohy budou brzy k dispozici.” |
| 4. Public intake abuse | **Rate limiting and idempotency passed; oversized/honeypot browser checks pending** | Approved rate-limit/intake SQL is applied to staging and synthetic company A is enabled. Live duplicate submission produced one lead, and responses did not disclose company B. Run [41046254837](https://github.com/svobonek-lab/dashboard/actions/runs/41046254837) sent 200 public requests: 5 accepted, 195 rate limited, zero unexpected responses, zero dropped iterations. Newly added Preview tests cover oversized input and honeypot no-write behavior but have not yet passed live. |
| 5. Load and stability | **Owner/employee and public-intake profiles passed on staging** | Run [41046254837](https://github.com/svobonek-lab/dashboard/actions/runs/41046254837) completed the ten-minute 30-owner/100-employee profile: read p95 243.48 ms, write p95 64.00 ms, zero acceptance errors and HTTP failures. In one-minute public intake, 200 requests produced 5 accepted and 195 expected 429s, with zero unexpected responses or dropped iterations. Exact-run synthetic cleanup completed and recovery found 0 remaining identities. |
| 6. Monitoring and route failures | **Route boundaries and owner flow passed; Preview Sentry delivery is unverified** | The owner journey had no uncaught application errors. Run [41044726790](https://github.com/svobonek-lab/dashboard/actions/runs/41044726790) passed seven scenarios and skipped the unavailable Storage scenario, but the Sentry event test failed: no envelope arrived. A direct read-only Preview probe also saw no Sentry initialization log or event request. Do not describe SDK delivery as verified until this is fixed and rerun. |
| 7. Marketing truthfulness | **Copy corrected on the working branch; legal identity incomplete** | The branch uses restrained pilot/planned-feature language and labels unavailable modules. The legal block remains visibly incomplete until the real IČO, address, and approved VOP are supplied. Production changes only after the draft is reviewed and merged. |
| 8. Stripe TEST | **NOT RUN** | No Preview TEST purchase, signed webhook, cancellation, period-end transition, or `past_due` screen has been verified. Do not start checkout unless TEST mode and the Start price are confirmed. See `docs/billing-acceptance.md`. |

## Local verification

- `npm test`: **484/484 passed** before the latest E2E-only additions; the affected load and workflow contract tests pass **11/11** afterward.
- `npx tsc --noEmit`: passed after the latest Playwright additions.
- `npx playwright test --config=playwright.staging.config.ts --list`: parsed all **10** staging scenarios.
- `git diff --check`: passed.
- The latest working-branch changes are on `codex/staging-e2e-local-runner`; product preview target was verified as staging project `xwzweltjvreqhjpbjrxa`, distinct from production `oncmtmrhmjlerbwkrecv`.

## Safety boundary

No production writes, migrations, Auth changes, Storage changes, or production endpoint submissions were performed. Staging fixtures contain synthetic data only. The private Storage path remains skipped by design until the separately reviewed notes/files migration and a private file fixture exist.
