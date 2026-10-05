# StavbaFlow pilot function audit — 4 October 2026

## Decision

The repository now presents an honest, focused pilot for a small construction company: owner login, company workspace, enquiries, assignment, employee scope, lifecycle status, public intake, team invitations, company profile, and controlled CSV import. Features without a verified write contract are excluded from the real-company navigation or clearly described as post-pilot work.

This is ready for a **supervised first-company pilot** after the operator checklist below. It is not evidence that an arbitrary customer's legacy database can already be connected or that production writes have been enabled.

## Read-only database connector update — 5 October 2026

The repository now contains the Synology connector runtime, tenant-bound signed APIs, reviewed mapping and dry-run approval flow, owner integration UI, digest-based updater/rollback, multi-architecture verification and operator runbooks. PostgreSQL, MySQL/MariaDB and SQL Server adapter contracts include direct source write-denial tests. These additions materially close the earlier simulated-SQL gap.

The connector is still **release-candidate code**, not a live customer integration. `supabase/staging/20261004_connector_contract.sql` has not been applied by this work, no image has been published from `main`, and the connector-specific staging/Preview scripts have not been run against an enrolled synthetic connector. Production Supabase, production Vercel and customer databases were not changed. Keep `VITE_CONNECTOR_ENABLED=false` until those gates pass and the resulting digest/evidence are recorded.

## Verified in this change

- A single login routes users by their resolved role.
- A new local test company remains selected after a full page reload.
- The new company sees zero jobs and zero employees; it no longer inherits seeded records from another company.
- Owner dashboard, sales, leads, projects, team, form setup, CSV import, and settings render in the browser.
- The public tenant path `/inquiry/:tenantKey` renders outside the authenticated workspace.
- The public form validates required data and consent, uses the anonymous tenant-safe RPC in configured environments, and reports success only after the write returns without an error.
- The form setup page embeds the actual public form URL. It no longer claims an unmeasured CDN size, load-time guarantee, or instant write.
- The employee dashboard contains only assigned jobs and persisted lifecycle actions.
- Team, project, lead detail, settings, and integration pages no longer expose simulated assignment, messaging, profitability, documents, connectors, or save success.
- Production company workspaces do not render the simulated AI assistant.
- The CSV pilot path sends the real source text through dry-run and commit review contracts; SQL, Sheets, and two-way sync remain explicitly post-pilot.
- The dashboard no longer accepts lead objects through untrusted `postMessage` events; the embed loader validates both origin and source and treats the configured button label as text.
- Website analysis requires a verified Supabase session before it can consume the paid AI provider.
- Vercel headers now include CSP and HSTS. Only the public intake surfaces are embeddable; the dashboard remains same-origin.
- Cron authentication uses a constant-time secret comparison and a generic external error. Email delivery requires an explicit verified `EMAIL_FROM`.
- Admin installation, admin demo generation, landing, and interactive demo are loaded as separate chunks. The main application chunk fell below the previous Vite warning threshold.
- The owner-approved public contact now uses `svobonek@gmail.com` and `Vincence Makovského 4428/11`; the sales CTA prepares an email and never claims it was sent.
- Legal modals remain gated until the provider's legal name and IČO are supplied. A brand name, contact email and address are not presented as a completed legal identity.
- The command palette now links only to the verified pilot routes and no longer advertises calendar, weather, quote, document, analytics, SQL, Synology or revenue modules.
- Deprecated simulated product modules and their unreachable route wrappers were removed from application source instead of remaining as dormant claims.

## Automated evidence

- Complete Node test suite.
- TypeScript check.
- Production Vite build.
- High-severity production dependency audit.
- Static regression checks for production fail-closed behavior, tenant-scoped writes, public intake routing, invite contract, employee assignment, and removal of simulated product claims.

Exact command results belong in the pull request description and CI run; they must be refreshed after the final commit.

## Existing staging evidence

The repository contains the earlier staging verification in `docs/staging-pilot-verification-20261001.md`. It covers the isolated staging project, application tables, RLS, synthetic role checks, public intake, invitation/recovery configuration, and security advisor state at that time.

The current shell does not contain staging credentials, so this change did not repeat live staging mutations. Production Supabase was not changed.

## Required operator checklist for the first paying pilot

1. Merge only after GitHub CI and both Vercel previews pass.
2. Configure the approved application origin and staging environment variables in the application Vercel project.
3. Rotate any staging service-role credential that was ever manually transferred, then store it only as a server-side secret.
4. Provision the real pilot company through the reviewed operator flow; do not use public self-signup.
5. Run the two-company staging checklist again with fresh synthetic accounts and retain the result.
6. Send and consume one real employee invitation, then verify recovery, logout, session expiry, assignment visibility, and status persistence.
7. Submit one synthetic enquiry through the company's real public tenant URL and confirm it appears only for that company.
8. Run one reviewed CSV dry-run and one idempotent commit retry before importing customer data.
9. Complete the seller's legal name and IČO, then obtain legal review for privacy information, data-processing terms, retention policy, backup/restore ownership, and incident contact. The approved public email and address are already present.
10. Agree in writing that the first offer includes form plus controlled CSV import. The Synology read-only connector may be added only after its separately reviewed staging acceptance; Google Sheets and two-way sync remain excluded.

## Remaining release risk

- Live staging was not rerun from this workstation because the required credentials are absent.
- Production writes and production database migrations remain intentionally disabled.
- Initial-load performance should still be measured on the deployed mobile preview. The main App chunk is now approximately 291 kB (74 kB gzip), down from the earlier approximately 1.35 MB bundle, and the removed simulation modules no longer ship in the application source.
- Legal, contractual, billing, support, and incident-response readiness are business tasks outside the source-code verification.

## Sellable claim

Use: “StavbaFlow is available as a supervised pilot for one construction company, covering enquiry intake, owner overview, employee assignment, status tracking, and controlled CSV onboarding.”

Do not yet use: “Works with every existing database,” “fully automatic migration,” “two-way synchronization,” or “production-ready without onboarding.”
