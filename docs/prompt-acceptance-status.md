# Prompt acceptance status (1–8)

Evidence is limited to the exact environment named below. A local SQL test or source test is not a staging acceptance result.

Last checked-in snapshot was captured at `2026-10-27T06:43:33Z` from StavbaCore Staging (`xwzweltjvreqhjpbjrxa`). It is being refreshed because a newer metadata capture is needed before treating hook, schema, Storage policies, and applied migration history as current. Production project ref in that snapshot is `oncmtmrhmjlerbwkrecv`; no production writes were made.

| Prompt | Status | Evidence and remaining gate |
|---|---|---|
| 1. Owner and two tenants | **Partial; live seed blocked** | The seed has a production-ref/URL guard and a no-write dry-run. `app_members` uses `company_id,user_id,name,email,role,active`; this matches the seed's membership row. No seed apply was run: `STAGING_SUPABASE_SERVICE_ROLE_KEY` is not available to this checkout, so no company/user IDs can be reported and membership/login is unverified. |
| 2. Tenant isolation | **Incomplete; staging E2E blocked** | Existing REST coverage is narrower than the requested owner+employee × resource × operation matrix. Snapshot shows RLS enabled and policies present on all 20 current tables, but this is not proof those policies prevent cross-tenant access. Synthetic IDs/records and employee-B credentials are not available here. |
| 3. Schema and migrations | **Partial** | The last snapshot had 20 tables, 202 columns, 36 policies and 32 functions; `app_lead_notes` and `app_lead_files` were absent. This branch extends the metadata-only capture to include Storage bucket/policy metadata and applied migration versions; a fresh snapshot is required before reporting current drift. A review-only notes/files SQL contract and disposable-Postgres verification already exist. This branch hides owner notes/files and employee photos by default and says “Přílohy budou brzy k dispozici”; the gate only enables against the explicitly declared staging ref. A migration-to-snapshot CI drift gate remains open. |
| 4. Public intake abuse | **Partial; local API tests and prior disposable DB run** | Existing/new API tests cover oversized customer, phone, email, title, description, and value; honeypot returns 202 without persistence; the response exposes neither a lead ID nor company data. SQL acceptance now checks oversized customer/email/title/description/value and exactly one lead for a repeated key. The prior disposable-Postgres burst run observed 5 accepted and 45 rate-limited requests from 50 same-IP requests in 286 ms. The updated SQL acceptance was not rerun locally because Docker Engine is unavailable; CI has the contract and burst steps. Staging apply/run was not performed. |
| 5. Load | **Not done** | No k6 scripts or measured report exist yet. Staging credentials and a safe load window/fixture set are unavailable. |
| 6. Monitoring and route failures | **Partial** | A global error boundary and Sentry tag code/tests exist. No synthetic event was verified in staging, no event reference was recorded, and the requested Playwright owner journey for login/status/import/export/logout is not complete. |
| 7. Marketing truthfulness | **Mostly implemented locally; deployment proof pending** | Existing copy checks cover unsupported pilot claims and unavailable surfaces. The exact current public production and Preview deployments still need independent verification; legal identity is incomplete until the real company identity, address and VOP are supplied. |
| 8. Stripe TEST end-to-end | **Not verified live** | Contract tests and disposable PostgreSQL billing verification exist. There is no recorded Preview TEST-mode purchase, signed webhook transition, cancellation/period-end check or `past_due` screen evidence in `docs/billing-acceptance.md`. |

## External gates needed to finish live acceptance

- Make the staging service-role secret available to the controlled staging seed workflow; never place it in chat, a repo file, or a test log.
- Supply/configure the synthetic account secrets and company/user fixture IDs used by the staging workflows, including employee B.
- Reconcile the migration history against this snapshot and review the notes/files SQL before any manual staging application. The snapshot explicitly says the Auth hook is currently disabled; confirm its intended staging configuration before enabling it.
- Provide isolated staging capacity and approved bounded load-test credentials/fixtures.
- Provide access to the staging Sentry project and Stripe TEST configuration; no production credentials should be used.
- Supply complete legal identity data before claiming the legal block is complete.

## Verification boundary

This branch has local tests/build checks and disposable PostgreSQL checks. They do not prove staging deployment, production behavior, a successful live login, tenant isolation, Sentry delivery, load thresholds or a Stripe purchase. Production remains read-only.
