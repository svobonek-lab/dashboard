# StavbaFlow BYODB Self-Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make an owner's mapped company database the source of truth for company and lead fields while preserving Managed Cloud and the existing connector architecture.

**Architecture:** Keep Supabase for authentication, tenant/control-plane operations, and the validated read projection. Add owner-authorized durable write operations that the outbound Synology connector applies with a reviewed mapping and then acknowledges. Use per-connector encrypted HMAC secrets; never expose SQL credentials to the browser.

**Tech Stack:** React 19/TypeScript/Vite, FSD, Vercel serverless API, Supabase/PostgreSQL contracts, Zod, Node 24, PostgreSQL/MySQL/MariaDB/SQL Server adapters, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-25-byodb-source-of-truth-design.md`

## Global Constraints

- Do not create another Supabase project or write to the production-shared project.
- Do not apply SQL migrations automatically; add reviewed proposals and use disposable fixtures only.
- Keep Managed Cloud behavior unchanged for companies that do not enable BYODB.
- In BYODB mode the customer database is authoritative for every mapped company/lead field.
- The browser never receives customer SQL credentials; the connector has no inbound listening port.
- HMAC secrets are unique per connector, encrypted at rest, returned once, and never logged or stored in browser storage.
- Only inspected schema identifiers and explicitly approved mapped columns may reach parameterized connector writes.
- Pending/offline/conflict states must never appear as successful writes.
- Preserve tenant-derived `company_id`, idempotency, audit history, and existing delete behavior.
- Require a reviewed immutable image digest before enabling package download or production mode activation.

## Review Focus

- A request that spoofs `companyId`, connector ID, record ID, or operation ID must be rejected or scoped to the authenticated tenant.
- A stale source version, duplicate operation, or lost acknowledgement must not overwrite newer source data or create duplicate writes.
- An offline connector or missing HMAC-encryption key must leave operations pending/disabled and disclose the actionable state without secret data.
- A mapping containing unknown identifiers, duplicate targets, hidden secret columns, or malformed conversions must be rejected before SQL construction.
- A package request without a reviewed digest or with an expired/rotated secret must not produce a runnable package or revive the old connector.
- A create replay after source commit must resolve through its stable external key; schemas that cannot accept that key cannot enable create.
- A source-side edit between sync and app write must produce a conflict, including when the table has no timestamp column.
- A table with no `updated_at` but a `created_at` field can use that field as a stable incremental watermark; when neither exists, it uses ordered primary-key scanning and canonical fingerprints.

---

### Task 1: BYODB domain and mapping contract

**Files:**
- Modify: `shared/connectorProtocol.ts`
- Modify: `api/_connector/validation.ts`
- Modify: `src/features/manage-integrations/api/connectorContract.ts`
- Create: `src/features/manage-integrations/model/byodbMapping.ts`
- Test: `tests/connector-api.test.ts`
- Test: `tests/connector-ui.test.ts`

**Interfaces:**
- Produces a versioned mode and mapping contract for `company` and `lead` entities, strict field allowlists, and pure field-name/type suggestions.
- Preserves existing `ConnectorMappingV1` callers through a compatibility parser where safe.

- [x] **Step 1: Write failing tests** for company/lead target allowlists, source-name suggestions (`firma_nazev`, `kontakt_email`, `zakazka_stav`), duplicate/unknown targets, and secret-like source columns.
- [x] **Step 2: Run** `npx tsx --test tests/connector-api.test.ts` and `npx tsx --test tests/connector-ui.test.ts`.
  **Expected:** new BYODB contract assertions fail because targets and suggestions are not yet exposed.
- [x] **Step 3: Implement** the shared types, strict Zod validation, and pure suggestion function; do not inspect source row values.
- [x] **Step 4: Run the same tests.**
  **Expected:** all new assertions and existing contract assertions pass.
- [x] **Step 5: Commit** `feat(byodb): define canonical source mappings`.

### Task 2: Per-connector HMAC secret lifecycle

**Files:**
- Modify: `api/_connector/signature.ts`
- Modify: `api/_connector/auth.ts`
- Modify: `api/_connector/routes/enroll.ts`
- Modify: `api/_connector/routes/register.ts`
- Modify: `connector/src/security/identity.ts`
- Modify: `connector/src/api/client.ts`
- Modify: `connector/src/config.ts`
- Create: `api/_connector/secretVault.ts`
- Modify: `supabase/staging/20261004_connector_contract.sql`
- Test: `tests/connector-signature.test.ts`
- Test: `connector/test/security/identity.test.ts`
- Test: `connector/test/api/client.test.ts`

**Interfaces:**
- Produces HMAC-SHA256 signing and verification over method, canonical path, timestamp, request ID, and body digest.
- Produces AES-256-GCM at-rest encryption/decryption for the per-connector secret using the deployment key `CONNECTOR_SECRET_ENCRYPTION_KEY`.
- Enrollment returns a random secret once; registration binds the encrypted secret to the enrolled connector. Existing Ed25519 identities remain rejected for new registrations; no released image currently exists.

- [x] **Step 1: Write failing tests** for valid/tampered signatures, canonical path binding, constant-time comparison boundary, timestamp rejection, replay, secret rotation, encryption roundtrip/tamper, and fail-closed missing encryption key.
- [x] **Step 2: Run** `npx tsx --test tests/connector-signature.test.ts` and, from `connector/`, `npx tsx --test test/security/identity.test.ts test/api/client.test.ts`.
  **Expected:** the HMAC and vault APIs are missing.
- [x] **Step 3: Implement** per-connector HMAC protocol and AES-GCM vault. Do not include secret values in returned errors or logs.
- [x] **Step 4: Run those tests.**
  **Expected:** valid requests pass; all invalid/replayed requests fail closed.
- [x] **Step 5: Commit** `feat(connector): sign requests with encrypted per-device HMAC secrets`.

### Task 3: Durable tenant-scoped BYODB operation contract

**Files:**
- Create: `supabase/staging/20261025_byodb_operations.sql`
- Modify: `api/_connector/routes/commands.ts`
- Modify: `api/_connector/routes/command.ts`
- Create: `api/_connector/routes/operations.ts`
- Modify: `api/_connector/validation.ts`
- Modify: `api/_connector/handler.ts`
- Test: `tests/connector-api.test.ts`
- Test: `tests/connector-staging-contract.test.ts`

**Interfaces:**
- Produces owner-authorized create/read operation endpoints and connector-authenticated poll/ack contracts.
- Operation rows carry server-derived company ID, UUID operation ID, idempotency key, entity, action, mapping version, expected source version, bounded payload, status, and safe error code.
- The staging SQL contract restricts mutation and operation reads to service-only RPCs and adds tenant-scoped read projection access.

- [x] **Step 1: Write failing tests** for owner/employee role authorization, tenant derivation, idempotency, command poll scope, bounded payloads, state transitions, and safe conflicts.
- [x] **Step 2: Run** `npx tsx --test tests/connector-api.test.ts tests/connector-staging-contract.test.ts`.
  **Expected:** BYODB operation operations are absent.
- [x] **Step 3: Implement** API validation and staging SQL functions/tables with service-only grants and explicit owner/employee scopes.
- [x] **Step 4: Run the same tests.**
  **Expected:** only valid authenticated tenant operations enter and leave the queue.
- [x] **Step 5: Commit** `feat(byodb): queue tenant-scoped source operations`.

### Task 4: Mapped transactional writes for supported SQL engines

**Files:**
- Modify: `connector/src/adapters/types.ts`
- Create: `connector/src/adapters/mappedOperations.ts`
- Modify: `connector/src/adapters/sqlSafety.ts`
- Modify: `connector/src/adapters/postgres.ts`
- Modify: `connector/src/adapters/mysql.ts`
- Modify: `connector/src/adapters/mssql.ts`
- Modify: `connector/src/commands/processCommands.ts`
- Modify: `connector/src/state/outbox.ts`
- Modify: `connector/src/sync/syncEngine.ts`
- Modify: `connector/src/config.ts`
- Test: `connector/test/adapters/contract.ts`
- Create: `connector/test/adapters/mappedOperations.test.ts`
- Test: `connector/test/adapters/postgres.test.ts`
- Test: `connector/test/adapters/mysql.test.ts`
- Test: `connector/test/adapters/mssql.test.ts`
- Test: `connector/test/sync/syncEngine.test.ts`
- Test: `connector/test/state/outbox.test.ts`

**Interfaces:**
- Produces `applyMappedOperation(operation, mapping, inspectedSchema)` for insert/update/delete of one canonical company/lead row only.
- All SQL identifiers come from inspected schema and mapping; all values are bound parameters. A transaction checks the expected source version before updating/deleting.
- The existing file-backed durable Outbox remains the retry store; add command-result persistence if needed without exposing source values in status.

- [x] **Step 1: Write failing adapter contract tests** for one mapped create/update/delete, an unmapped-field injection, identifier injection, stale-timestamp and stale-fingerprint conflicts, stable-key create replay, unsupported auto-increment create, and rollback on each engine.
- [x] **Step 2: Run** the focused adapter tests from `connector/` with `npx tsx --test test/adapters/postgres.test.ts test/adapters/mysql.test.ts test/adapters/mssql.test.ts` and confirm each new case fails for the missing operation method.
- [x] **Step 3: Implement** engine-specific prepared statements and transactional conflict checks; use a separate write credential path while keeping read-only sync connections unchanged.
- [x] **Step 4: Run** `npm test` from `connector/`.
  **Expected:** mapped writes work in fixtures, unauthorized writes are rejected, and existing sync/outbox tests remain green.
- [x] **Step 5: Commit** `feat(connector): apply approved mapped database operations`.

### Task 5: Signed operation execution and cloud projection

**Files:**
- Modify: `connector/src/api/client.ts`
- Modify: `connector/src/runtimeBootstrap.ts`
- Modify: `connector/src/commands/processCommands.ts`
- Create: `connector/src/commands/processOperations.ts`
- Modify: `api/_connector/routes/commands.ts`
- Modify: `api/_connector/routes/ingest.ts`
- Modify: `api/_connector/validation.ts`
- Modify: `supabase/staging/20261025_byodb_operations.sql`
- Test: `tests/connector-api.test.ts`
- Test: `connector/test/runtime.test.ts`
- Test: `connector/test/commands/processCommands.test.ts`
- Test: `connector/test/commands/processOperations.test.ts`
- Modify: `connector/test/api/client.test.ts`

**Interfaces:**
- Produces a pipeline that polls signed operations, validates mapping version, applies one source mutation, durably queues its result, submits a signed ingest/ack, and advances state only after server acknowledgement.
- Server derives `company_id` from connector identity and stores only allowlisted canonical fields in the mirror.
- Every stage is idempotent by operation/request ID; pending operations are queryable by the owner tenant.

- [x] **Step 1: Write failing tests** for poll→mutate→acknowledged projection, network loss before/after source commit, duplicate poll, bad HMAC, and source failure.
- [x] **Step 2: Run** `npx tsx --test tests/connector-api.test.ts` and the focused connector command/runtime tests.
  **Expected:** the end-to-end write pipeline is missing.
- [x] **Step 3: Implement** signed operation execution and server-side projection/ack transitions.
- [x] **Step 4: Run the same tests.**
  **Expected:** source and mirror converge once, retries do not duplicate, and offline operations remain pending.
- [x] **Step 5: Commit** `feat(byodb): sync acknowledged source writes into the tenant view`.

### Task 6: Mode-aware repository and owner/employee write status

**Files:**
- Modify: `src/shared/api/data/types.ts`
- Modify: `src/shared/api/data/repositoryFactory.ts`
- Create: `src/shared/api/data/ByodbRepository.ts`
- Modify: `src/shared/api/data/SupabaseRepository.ts`
- Modify: `api/_connector/routes/operations.ts`
- Modify: `src/app/providers/OrganizationProvider.tsx`
- Test: `tests/connector-api.test.ts`
- Test: `tests/connector-ui.test.ts`

**Interfaces:**
- Produces per-company mode resolution while keeping the existing cloud repository as the fallback.
- BYODB reads use the tenant read projection; mapped business writes wait for the operation result or return an explicit pending/conflict error with an idempotency reference.
- The repository never falls through to a cloud write after a BYODB source error.

- [x] **Step 1: Write failing tests** proving managed-cloud calls are unchanged; BYODB lead/company writes enter the operation API; pending/offline/conflict results cannot be rendered as saved; no BYODB error falls back to Supabase writes.
- [x] **Step 2: Run** `npm test -- tests/connector-ui.test.ts tests/connector-api.test.ts`.
  **Expected:** mode-aware repository assertions fail because only the Supabase repository exists.
- [x] **Step 3: Implement** mode-aware repository and safe pending/result behavior for mapped fields.
- [x] **Step 4: Run the same tests.**
  **Expected:** cloud behavior is unchanged and BYODB writes acknowledge source commits.
- [x] **Step 5: Commit** `feat(byodb): route mapped company writes through connector`.

### Task 7: Owner mode wizard, mapping, status, and generated bundle

**Files:**
- Modify: `src/pages/owner/integrations/ui/Integrations.tsx`
- Modify: `src/features/manage-integrations/ui/ConnectorSetup.tsx`
- Modify: `src/features/manage-integrations/ui/ConnectorMapping.tsx`
- Modify: `src/features/manage-integrations/ui/ConnectorStatus.tsx`
- Create: `src/features/manage-integrations/ui/SmartFieldMappingModal.tsx`
- Modify: `src/features/manage-integrations/api/connectorContract.ts`
- Modify: `src/features/manage-integrations/api/connectorClient.ts`
- Create: `src/features/manage-integrations/model/buildConnectorPackage.ts`
- Modify: `docker-compose.synology.yml`
- Modify: `connector/compose.yaml`
- Test: `tests/connector-ui.test.ts`

**Interfaces:**
- Produces the requested mode selector and steps for driver choice, one-time package secret, schema/table/field review, non-mutating connection checks, and live status.
- Bundle builder returns ZIP bytes for `docker-compose.synology.yml` and `config.json`; only the reviewed immutable image digest is accepted; source DB credentials are file-path placeholders.
- `ConnectorStatus` exposes connected, pending write count, last sync, sync failure, conflict, and safe retry states.

- [x] **Step 1: Write failing tests** for mode gating, field suggestions, required-field mapping, missing digest, ZIP file names/content, secret absence from logs/storage, and status labels.
- [x] **Step 2: Run** `npx tsx --test tests/connector-ui.test.ts`.
  **Expected:** bundle and BYODB states are absent.
- [x] **Step 3: Implement** UI by extending existing FSD slices and the project's workspace styles; keep secret display one-time and keyboard accessible.
- [x] **Step 4: Run** the same tests and `npm run lint`.
  **Expected:** tests, TypeScript, and ESLint pass.
- [x] **Step 5: Commit** `feat(byodb): add self-service database mode wizard` (`a05a144`).

### Task 8: Full synthetic acceptance, three-action Synology guide, and release boundaries

**Files:**
- Modify: `tests/connector-api.test.ts`
- Modify: `docs/synology-connector-install.md`
- Modify: `docs/synology-connector-operations.md`
- Modify: `WORKPLAN.md`
- Modify: `.env.example`
- Modify: connector/API/UI fixtures as needed

**Interfaces:**
- Produces a synthetic test that covers enrollment, heartbeat, schema discovery, suggestions, reviewed mapping, source operation, signed ingest, tenant isolation, retry, and visible status.
- Documents exactly three top-level Container Manager actions while retaining explicit local credential setup and failure recovery.
- Documents `CONNECTOR_SECRET_ENCRYPTION_KEY` by name only, never its value.

- [x] **Step 1: Write failing acceptance assertions** for the whole synthetic lifecycle and the install guide's three actions and credential boundaries.
- [x] **Step 2: Run** the focused root and connector tests and confirm missing acceptance behavior fails.
- [x] **Step 3: Implement** any missing integration glue and documentation.
- [x] **Step 4: Run** `npm ci`, `npm test`, `npm run lint`, `npm run build`, `npm ci --prefix connector`, `npm test --prefix connector`, `npm run lint --prefix connector`, and `npm run build --prefix connector` sequentially.
  **Expected:** all commands pass; the connector unit suite may skip adapter-fixture tests only when disposable databases are not configured, and skips are reported honestly.
- [x] **Step 5: Review** generated bundle contents, staged diff, and secret scan; verify git status and no production/staging writes occurred.
- [ ] **Step 6: Commit** `docs(byodb): document self-service connector setup` and open a draft PR against `main`.

## Final review focus

Review the entire branch for source-of-truth correctness, mode isolation, HMAC key lifecycle, generated package safety, parameterized writes, replay/idempotency, and honest pending/offline/conflict UI. Keep BYODB activation and package download disabled until a reviewed immutable image digest and isolated staging acceptance exist.
