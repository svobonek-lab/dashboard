# Prompt acceptance status (1–8)

Status checked 2026-10-30. Production Supabase remains read-only. Live staging results are kept separate from local, disposable-Postgres, and Preview evidence.

| Prompt | Status | Evidence and remaining gate |
|---|---|---|
| 1. Owner and two tenants | **Staging owner flow passed** | After the approved import-worker SQL and staging Preview correction, run [41043623719](https://github.com/svobonek-lab/dashboard/actions/runs/41043623719) passed owner login, status update, CSV import/export, logout, tenant REST isolation, assignment, export, and intake idempotency. Exact synthetic imports were rolled back. |
| 2. Tenant isolation | **REST and assignment checks passed; Storage remains blocked** | Owner A and employee A could not access or change company B rows; owner B’s independent fixture remained visible. Private file download test is skipped because the prompt keeps the notes/files migration review-only and no file bucket/fixture exists. |
| 3. Schema and migrations | **Snapshot and drift CI check exist; live schema still differs** | Metadata snapshot [41033508835](https://github.com/svobonek-lab/dashboard/actions/runs/41033508835) records 30 relations, 318 columns, 56 policies, and 61 functions. Comparison reports unresolved drift in both migration folders. The CI guard fails on drift. Do not batch-apply legacy SQL. Notes/files migration remains a review-only draft; UI is gated and states “Přílohy budou brzy k dispozici.” |
| 4. Public intake abuse | **Passed on staging; production configuration incomplete** | Approved rate-limit/intake SQL is applied to staging and synthetic company A is enabled. [Preview run 41053496857](https://github.com/svobonek-lab/dashboard/actions/runs/41053496857) passed duplicate submission, oversized-field rejection, honeypot no-write behavior, and company-B response isolation. Run [41046254837](https://github.com/svobonek-lab/dashboard/actions/runs/41046254837) sent 200 public requests: 5 accepted, 195 rate limited, zero unexpected responses, zero dropped iterations. Production Vercel has no `INTAKE_HASH_SECRET`, so ordinary intake submissions fail closed. |
| 5. Load and stability | **Owner/employee and public-intake profiles passed on staging** | Run [41046254837](https://github.com/svobonek-lab/dashboard/actions/runs/41046254837) completed the ten-minute 30-owner/100-employee profile: read p95 243.48 ms, write p95 64.00 ms, zero acceptance errors and HTTP failures. In one-minute public intake, 200 requests produced 5 accepted and 195 expected 429s, with zero unexpected responses or dropped iterations. Exact-run synthetic cleanup completed and recovery found 0 remaining identities. |
| 6. Monitoring and route failures | **Owner journey passed; Sentry delivery remains unstable** | The owner login/status/CSV/export/logout journey had no uncaught application errors in [41053496857](https://github.com/svobonek-lab/dashboard/actions/runs/41053496857). Direct Vite env access and the exact Sentry ingest host were fixed. The isolated Sentry SDK/privacy test passed in [41052381803](https://github.com/svobonek-lab/dashboard/actions/runs/41052381803), but the synthetic event received HTTP 403 in the full suite twice. Treat full-suite delivery as unresolved. |
| 7. Marketing truthfulness | **Copy merged; legal identity incomplete** | The merged product uses restrained pilot/planned-feature language and labels unavailable modules. The legal block remains visibly incomplete until the real IČO, address, and approved VOP are supplied. |
| 8. Stripe TEST | **NOT RUN** | The Stripe test secret and Start price are scoped to older Vercel Preview branches, not the verified `codex/staging-e2e-local-runner` Preview. No TEST purchase, signed webhook, cancellation, period-end transition, or `past_due` screen has been verified. See `docs/billing-acceptance.md`. |

## Local verification

- `npm test`: **486/486 passed** on the import-guard follow-up branch.
- `npm run lint` and `npm run build`: passed on the import-guard follow-up branch.
- `npx playwright test --config=playwright.staging.config.ts --list`: parsed all **10** staging scenarios.
- `git diff --check`: passed.
- [PR #143](https://github.com/svobonek-lab/dashboard/pull/143) merged into `main` at 11:45:51 UTC on 2026-10-30. Vercel production deployment `dpl_CceK6QLWU71Etp26ctgj1PdwWLhF` is Ready for that merge. It promotes application code, not staging database schema or data. The verified staging Preview targets `xwzweltjvreqhjpbjrxa`, distinct from production `oncmtmrhmjlerbwkrecv`.
- GitHub-hosted PR checks were rejected before their first step by the account billing/spending limit. The recorded local checks and self-hosted staging runs are independent evidence.
- Read-only Vercel production inventory found no `INTAKE_HASH_SECRET` or legacy `PUBLIC_INTAKE_HASH_SECRET`. `APP_IMPORT_WORKER_ENABLED` exists, but its value was not revealed and the production `app_import_leads` signature has not been checked through the approved read-only production MCP. Production import acceptance remains open. The follow-up branch adds an explicit staging project guard to import commits; production needs a separately reviewed database contract and release gate.

## Safety boundary

No production writes, migrations, Auth changes, Storage changes, or production endpoint submissions were performed. Staging fixtures contain synthetic data only. The private Storage path remains skipped by design until the separately reviewed notes/files migration and a private file fixture exist.
