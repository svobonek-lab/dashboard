# BYODB Full-Domain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the customer source authoritative for all business domains and all lead ingress routes in BYODB mode, then prove the staged connector and publish a digest-pinned image.

**Architecture:** Extend the approved, versioned mapping and durable operation protocol to every business entity. Keep tenant identity, Auth and control state in Supabase; apply business writes only through the outbound connector. Transfer file bytes to customer NAS storage through a bounded, authenticated relay.

**Tech Stack:** TypeScript, React, Vercel API, Supabase staging SQL, Node connector, PostgreSQL, MariaDB, SQL Server, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-byodb-full-domain-design.md`

## Global Constraints

- Use the existing StavbaCore Staging project only; production Supabase is strictly read-only.
- Never auto-apply SQL or deploy functions. SQL proposals require separate review and staging verification.
- Never disable RLS or use a browser-to-customer-SQL connection.
- A queued write is pending, not saved. No Supabase business-row fallback in BYODB mode.
- Keep the deployment flag off until full-domain acceptance, exact-commit image digest and staging Preview verification.

## Review Focus

- A mapping from a different company must fail before a command is queued.
- A deleted or reassigned lead must not expose its notes or files to the old employee.
- An offline connector must leave public, AI and CSV writes pending without claiming success.
- A replayed upload or import row must not duplicate source data or binary objects.
- A source write committed before a lost acknowledgement must reconcile without overwriting a newer source edit.

---

### Task 1: Extend the canonical protocol and mapping validation

**Files:** `shared/connectorProtocol.ts`, `api/_connector/validation.ts`, `connector/src/mapping/compileMapping.ts`, `tests/connector-api.test.ts`, `connector/test/mapping.test.ts`.

- [x] Write failing tests for `employee_directory`, `project`, `lead_note`, and `lead_file` mappings, including required fields, relationship keys and rejected unknown payloads.
- [x] Run the targeted tests and confirm each fails for the intended missing contract.
- [ ] Add the entity types and field allowlists; define exact create requirements and size limits for notes and metadata. Field allowlists and mapping requirements are in place; create validation and per-field limits remain for the operation path.
- [x] Run the targeted tests, `npm test`, root lint/build and connector lint/build. Root 419/419, connector 83 passing; the six fixture cases later passed twice with Docker. All lint/build checks passed.
- [x] Commit the protocol and validation change (`e613cde`).

### Task 2: Implement mapped source CRUD for operational employees and projects

**Files:** `connector/src/adapters/mappedOperations.ts`, `connector/src/api/client.ts`, `connector/src/commands/processOperations.ts`, `api/_connector/routes/operations.ts`, `connector/test/mappedOperations.test.ts`, `connector/test/adapters.integration.test.ts`.

- [x] Add failing unit and disposable DB fixture tests for create/update/delete, replay, conflict and non-generated stable keys on all three SQL engines. The three new source-write cases passed twice (26/26 full adapter suite, zero skips).
- [x] Run targeted tests to confirm current company/lead restrictions reject owner creates for operational employees and projects before extending the contract.
- [x] Extend connector and API validators with entity-specific required fields and owner-only operational employee/project writes. Targeted tests, 420 root tests, 84 active connector tests, lint and builds pass; SQL and relationship checks remain separate tasks.
- [ ] Reject dangling lead/customer references and cross-company IDs before enqueue and before source commit.
- [ ] Verify tests and commit.

### Task 3: Add tenant-scoped read projections and operation queue support

**Files:** new reviewed SQL proposal under `supabase/staging/`, `api/_connector/routes/operations.ts`, `scripts/connector-staging-preflight.mjs`, `tests/connector-api.test.ts`, `tests/connector-staging.test.ts`.

- [ ] Test owner/employee projections, RLS/grants and operation queue for new entity types with two synthetic companies.
- [ ] Add a migration proposal that alters only the reviewed `app_*` contracts, including explicit role/entity checks and mapping-version validation. Never apply automatically.
- [ ] Extend read-only metadata preflight to verify the new constraints, RPC signatures, RLS and grants.
- [ ] Exercise proposal against a disposable local Supabase-compatible database; obtain separate staging approval before applying there.
- [ ] Commit SQL and tests.

### Task 4: Route browser employees, projects and notes to BYODB

**Files:** `src/shared/api/data/ByodbRepository.ts`, `src/shared/api/data/types.ts`, owner/employee feature callers, `tests/byodb-repository.test.ts`, owner Playwright tests.

- [ ] Add failing tests that assert BYODB never calls cloud employee, project or note business-row writes.
- [ ] Implement projection mapping and durable operations; keep `app_members` identity lookup separate from operational employee directory.
- [ ] Preserve pending/conflict messages and stale-version handling in the UI.
- [ ] Verify root tests/lint/build and commit.

### Task 5: Transfer private lead files to customer NAS

**Files:** new file-transfer protocol and server route under `api/_connector/`, connector file store module, `src/shared/api/data/ByodbRepository.ts`, new reviewed SQL proposal, file transfer tests.

- [ ] Test upload, download, deletion, replay, offline pending, scope denial, digest mismatch, path traversal and expiry before implementation.
- [ ] Add bounded encrypted relay objects, tenant-scoped transfer authorization and connector-owned atomic NAS write; source SQL stores mapped metadata and SHA-256.
- [ ] Make browser repository use this path in BYODB mode. Never leave a successful-looking cloud-only file.
- [ ] Verify synthetic round trip and cleanup, then commit.

### Task 6: Route public intake, AI intake and CSV commit through source operations

**Files:** `api/incoming-lead.ts`, `api/incoming-lead-config.ts`, `api/import-leads.ts`, AI intake handler, `src/pages/owner/integrations/ui/Integrations.tsx`, import and intake tests.

- [ ] Test derived tenant, consent, idempotency, offline pending, source acknowledgement and cross-company denial.
- [ ] Make public and AI intake queue mapped leads; return pending receipt until source confirmation.
- [ ] Preserve CSV dry-run; queue deterministic batch rows and conditional rollback operations. Show per-row pending/applied/conflict states.
- [ ] Remove BYODB disablement only after the full source path passes tests. Verify and commit.

### Task 7: Staging acceptance and release without paid GitHub-hosted minutes

**Files:** `.github/workflows/connector-verify.yml`, `.github/workflows/connector-staging-acceptance.yml`, `.github/workflows/connector-publish.yml`, acceptance tests, `docs/audits/`.

- [x] Run the six skipped fixture tests with disposable PostgreSQL, MariaDB and SQL Server. After Windows restart Docker Engine 29.9.2 started; `RUN_DB_INTEGRATION=1 npm run test:integration --prefix connector` passed twice (22/22 each, zero skips). Synthetic containers and network were removed with `docker compose down -v`.
- [ ] Configure a dedicated self-hosted runner restricted to trusted `main` manual jobs if the repository owner chooses this no-GitHub-charge route. Do not expose secrets to PR code.
- [ ] Run read-only staging metadata preflight and manually reviewed SQL rollout; verify two-company isolation, employee rights and all domain paths.
- [ ] Run logged-in owner Playwright against the staging Preview and a synthetic source; verify files and public/AI/CSV paths.
- [ ] Publish only after exact-commit acceptance succeeds; record immutable image digest, install it in staging and verify heartbeat, dry run, writes, replay and recovery.
- [ ] Enable BYODB in staging only after every acceptance item passes; keep production untouched.

## Current evidence

PR #127 is merged. The connector's original six fixture cases passed twice locally after the host restart. Operational employee/project CRUD, replay and conflict now also pass on disposable PostgreSQL, MariaDB and SQL Server. GitHub-hosted Actions jobs remain blocked before execution. No successful full-domain staging acceptance or released image digest exists.
