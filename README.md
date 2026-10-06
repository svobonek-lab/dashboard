# StavbaFlow

StavbaFlow is a multi-company construction dashboard for small building firms. The pilot flow covers owner and employee sign-in, role-based routing, inquiries, employee assignment, lifecycle changes, audit history, public-form intake and controlled CSV import.

## Pilot scope

The verified staging pilot supports:

- one login page with automatic owner or employee routing;
- company isolation enforced by Supabase RLS and tested with two synthetic companies;
- owner lead creation, assignment and lifecycle updates;
- employee visibility limited to assigned jobs and status-only updates;
- one-time, expiring employee invitations through Supabase Auth;
- public inquiry intake resolved by a tenant slug, with idempotency and rate limiting;
- CSV import with mapping, fingerprint-based idempotency and rollback of unchanged imports;
- an append-only audit history for lead creation and status changes.

The AI dispatcher change set adds a signed per-company e-mail webhook, strict Gemini extraction, visible lead-source badges and a scheduled 24-hour unanswered-lead alert. It remains fail-closed until the staging-only SQL contract and the server-only runtime variables are reviewed for the target deployment.

Google Sheets and bidirectional database synchronization are not part of the first customer pilot. A read-only Synology connector for PostgreSQL, MySQL/MariaDB and Microsoft SQL Server is implemented behind `VITE_CONNECTOR_ENABLED`; it must remain disabled until the connector staging contract, two-company authorization check and exact image digest have been reviewed for that deployment.

## Environments

| Environment | Purpose | Data policy |
| --- | --- | --- |
| Local demo | UI development with synthetic data | Local browser storage only |
| Supabase staging | Functional pilot and security verification | Synthetic test data only |
| Production | Customer operation after a reviewed release decision | No migration or write enablement from CI |

Production Supabase remains read-only for agent work. Database migrations, production writes and production deployment require a separate reviewed release decision.

## Local verification

Use Node 24 and the committed lockfile:

```bash
npm ci
npm test
npm run lint
npm run build
```

`npm run lint` performs TypeScript checking. The test suite includes authorization, invitation, import, public-intake, deployment-surface and outbox contracts.

The connector has its own checks:

```bash
cd connector
npm ci
npm test
npm run lint
npm run build
```

## Runtime configuration

Copy `.env.example` to a local untracked environment file. Never commit credentials.

Client settings:

- `VITE_DEPLOYMENT_SURFACE`: `landing`, `app` or `unified`.
- `VITE_APP_URL`: login application URL used by the landing deployment.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: browser-safe Supabase configuration.
- `VITE_APP_SCHEMA_READS`: enables the reviewed `app_*` read path.
- `VITE_PILOT_WRITES`: enables writes only for the explicitly allowlisted staging project.
- `VITE_CONNECTOR_ENABLED`: reveals the owner connector workspace only after its server and staging contract are configured.

Server-only settings:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: Vercel Functions only; never expose the service key through a `VITE_` variable.
- `APP_INVITE_WORKER_ENABLED`: explicitly enables the invitation endpoint for the reviewed staging deployment.
- `RESEND_API_KEY`: optional outbox delivery provider. Without it the worker fails before database access and never reports a false delivery.
- `GEMINI_API_KEY` and optional `GEMINI_MODEL`: server-side lead extraction. Never expose the key through a `VITE_` variable.
- `AI_INBOX_SIGNING_SECRET`: at least 32 characters; derives a different webhook token for every company.
- `CRON_SECRET` and `EMAIL_FROM`: protect the scheduler and identify verified alert delivery.

The reviewed staging proposal for these features is `supabase/staging/20261006_ai_dispatcher_contract.sql`. It creates service-only idempotency and notification tables, stores AI e-mail leads with `source = 'ai_inbox'`, stores embedded-form leads with `source = 'widget'`, and enqueues each 24-hour alert once. It is a review artifact and is never applied by CI.

## Customer onboarding

Follow [the pilot operator runbook](docs/pilot-operator-runbook.md). A customer is not active until owner login, employee activation, assigned-job visibility, public intake, CSV import and cross-company isolation have all been verified in the intended environment.

Review a staging onboarding plan without writing data:

```bash
npm run provision:staging -- --name "Synthetic Company" --slug "synthetic-company" --owner-name "Synthetic Owner" --owner-email "owner@example.test"
```

The command is restricted to the documented staging project and requires a separate `--apply` flag before it sends an invitation or creates a company. Keep `STAGING_SUPABASE_SERVICE_ROLE_KEY` outside the repository and never expose it through a `VITE_` variable.

Current staging evidence is recorded in [the pilot verification report](docs/staging-pilot-verification-20261001.md). The implementation ledger lists the remaining release actions in [docs/pilot-implementation-ledger.md](docs/pilot-implementation-ledger.md).

The Synology connector is installed using [the connector installation guide](docs/synology-connector-install.md) and operated using [the incident and operations guide](docs/synology-connector-operations.md). It is outbound-only, uses a read-only source account, and never needs a browser-visible database credential.

The current decision about what can be sold, what must be completed before the first customer, and which landing-page claims exceed the verified pilot is recorded in [the 2026-10-03 sales-readiness audit](docs/audits/sales-readiness-audit-2026-10-03.md).

## Release rules

- Work on a feature branch and merge only after human review.
- Do not enable auto-merge or automatic database migrations.
- Do not run production writes to verify behavior.
- A green build is necessary but does not replace browser, API and database isolation checks.
- Never claim an email was delivered until the provider accepted it and the result was persisted.
