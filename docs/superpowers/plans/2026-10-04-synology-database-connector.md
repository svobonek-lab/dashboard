# StavbaFlow Synology Database Connector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a verified, outbound-only Synology connector that incrementally imports mapped records from PostgreSQL, MySQL/MariaDB, and Microsoft SQL Server into a tenant-isolated StavbaFlow staging workspace without writing to the source database.

**Architecture:** A separate TypeScript service in `connector/` reads a customer database through a restricted adapter, converts rows to versioned canonical entities, persists cursors and an outbox on a mounted NAS volume, and signs outbound requests with a locally generated Ed25519 key. Narrow Vercel APIs verify the connector identity and tenant, write through reviewed staging RPC contracts, and expose owner-only enrollment, mapping, command, and status operations to the dashboard.

**Tech Stack:** Node.js 24, TypeScript, Node test runner, React 19, Vite 6, Supabase/PostgreSQL RLS and RPC, Docker Buildx, PostgreSQL, MariaDB, Microsoft SQL Server, GitHub Actions, GHCR, Synology Container Manager.

**Spec:** `docs/superpowers/specs/2026-10-04-synology-database-connector-design.md`

## Global Constraints

- Work only on dedicated branches and PRs; never commit or push directly to `main`, merge, or enable auto-merge.
- Production Supabase is read-only; do not run production writes, migrations, RPC calls, Auth operations, storage writes, or deploys.
- Apply database changes only to the isolated staging project after separate review; automated tests use synthetic local containers.
- The connector never writes to the customer's source database and never needs an inbound NAS port or Docker socket.
- Source credentials and the connector private key remain on the NAS and never enter the browser, Supabase, logs, or image.
- Support `linux/amd64` and `linux/arm64`, PostgreSQL, MySQL/MariaDB, and Microsoft SQL Server.
- Automatic sync runs every minute; five consecutive run-level failures pause it.
- The first import and every mapping-version change require a dry run and owner approval.
- Source deletions archive records; they never hard-delete records or audit history.
- Invoices and payments remain read-only, and imported employees never become login users automatically.
- Use Node 24 and committed lockfiles. Do not weaken `npm ci`, tests, TypeScript checking, build, or security checks.

## Review Focus

1. A source row changes at the same timestamp as another row: the compound `(updated_at, primary_key)` cursor must import both exactly once; Task 3 adds this adapter contract test.
2. A signed batch is replayed or carries another company ID: the API must reject it before any write; Task 6 adds signature, nonce, and tenant-binding tests.
3. The NAS loses power after writing an outbox item but before receiving acknowledgement: restart must resend safely without advancing the cursor; Task 2 adds the crash-recovery test.
4. A mapping changes while events from the old mapping remain queued: the server must reject mixed versions and require a new dry run; Tasks 4 and 7 add protocol and staging tests.
5. An update image starts but cannot produce a signed heartbeat: the updater must restore the previous digest without changing secrets or mapping; Task 10 adds the rollback test.

---

## Planned file structure

### Connector package

- `connector/package.json`, `connector/package-lock.json`, `connector/tsconfig.json`: isolated Node service build and test configuration.
- `shared/connectorProtocol.ts`: canonical entities, envelopes, acknowledgements, commands, status types, and shared allowlists used by connector and APIs.
- `connector/src/protocol/canonical.ts`: canonical validation, normalization, fingerprints, and field allowlists.
- `connector/src/security/identity.ts`: Ed25519 generation, protected local persistence, and request signing.
- `connector/src/state/atomicStore.ts`: atomic JSON reads/writes.
- `connector/src/state/outbox.ts`: durable event queue and acknowledgement.
- `connector/src/state/checkpoints.ts`: adapter cursors, fingerprints, mapping version, and failure counters.
- `connector/src/adapters/types.ts`: common source adapter interface.
- `connector/src/adapters/postgres.ts`, `mysql.ts`, `mssql.ts`: engine-specific read-only adapters.
- `connector/src/mapping/compileMapping.ts`: validated source-to-canonical conversion plan.
- `connector/src/sync/syncEngine.ts`: dry run, reconciliation, event creation, cursor advancement, retry, and pause rules.
- `connector/src/api/client.ts`: enrollment, signed ingestion, commands, and heartbeat HTTP client.
- `connector/src/config.ts`, `connector/src/main.ts`, `connector/src/health.ts`: configuration, lifecycle, scheduler, and local health probe.
- `connector/Dockerfile`, `connector/compose.yaml`, `connector/scripts/install.ps1`, `connector/scripts/update.ps1`: multi-architecture image and Synology operator bundle.

### Dashboard and server

- `src/app/connectorContract.ts`: browser-safe connector and mapping types.
- `src/app/connectorClient.ts`: authenticated owner API client.
- `api/_connector/http.ts`, `auth.ts`, `signature.ts`, `supabaseAdmin.ts`, `validation.ts`: shared server-only boundaries.
- `api/connector-enroll.ts`, `connector-status.ts`, `connector-mapping.ts`, `connector-command.ts`: owner operations.
- `api/connector-register.ts`, `connector-heartbeat.ts`, `connector-ingest.ts`, `connector-commands.ts`: connector operations.
- `supabase/staging/20261004_connector_contract.sql`: staging-only schema, functions, grants, and RLS.
- `supabase/tests/connector_authorization.sql`: two-company SQL authorization assertions.
- `components/integrations/ConnectorSetup.tsx`, `ConnectorMapping.tsx`, `ConnectorStatus.tsx`: owner setup, mapping, and operations.
- `src/pages/owner/Integrations.tsx`: compose CSV pilot and verified connector UI.

### Verification and release

- `tests/connector-*.test.ts`: server and browser-safe contracts.
- `connector/test/**/*.test.ts`: connector unit and adapter contract tests.
- `connector/test/fixtures/*.sql`: synthetic database fixtures.
- `connector/compose.test.yaml`: three-engine local integration environment.
- `.github/workflows/connector-verify.yml`: unit, integration, build, and vulnerability checks.
- `.github/workflows/connector-publish.yml`: reviewed stable GHCR publication.
- `scripts/connector-staging-e2e.mjs`: two-company API/RLS acceptance test.
- `docs/synology-connector-install.md`, `docs/synology-connector-operations.md`: install and support runbooks.

## Pull request checkpoints

The work is delivered as three substantial review units, as approved by the owner. Each unit gets its own branch and draft PR; it is not merged by the agent. A later unit may be prepared as a stacked branch while an earlier one is under review, but its PR must state the exact base and dependency.

1. `feature/connector-core`: Tasks 1–5 — protocol, durable state, three database adapters, sync engine, runtime, and container packaging.
2. `feature/connector-platform`: Tasks 6–9 — signed server API, staging/RLS contract, owner operations, and dashboard integration; based on connector core until the first PR merges.
3. `feature/connector-release-pilot`: Tasks 10–12 — multi-architecture CI/release, updater rollback, two-company staging/browser acceptance, and operator documentation; based on the combined reviewed implementation.

At every checkpoint: refresh from `origin/main`, resolve dependencies without force-pushing a reviewed branch, run that unit's checks, scan the staged diff for secrets, push, open or update the draft PR, attach it to this task, and record exact verification. Do not merge, enable auto-merge, apply production migrations, or deploy production.

---

### Task 1: Establish the canonical protocol and cryptographic identity

**Files:**
- Create: `connector/package.json`
- Create: `connector/package-lock.json`
- Create: `connector/tsconfig.json`
- Create: `shared/connectorProtocol.ts`
- Create: `connector/src/protocol/canonical.ts`
- Create: `connector/src/security/identity.ts`
- Test: `connector/test/protocol/canonical.test.ts`
- Test: `connector/test/security/identity.test.ts`

**Interfaces:**
- Produces: `CanonicalEntityType`, `CanonicalRecordV1`, `IngestEnvelopeV1`, `IngestAckV1`, and `ConnectorCommandV1` from `shared/connectorProtocol.ts`; plus `validateCanonicalRecord(value)`, `fingerprintCanonicalRecord(record)`, `loadOrCreateIdentity(path)`, and `signRequest(identity, request)`.
- Signature input: `${method}\n${pathname}\n${timestamp}\n${requestId}\n${sha256(body)}` encoded as UTF-8 and signed with Ed25519.

- [ ] **Step 1: Create the connector package with locked dependencies**

Use Node 24, ESM, `tsx --test`, `typescript`, `pg`, `mysql2`, and `mssql`. Add scripts `test`, `lint`, `build`, `start`, and `test:integration`. Generate and commit `connector/package-lock.json` with `npm install --package-lock-only` from `connector/`.

- [ ] **Step 2: Write failing canonical validation tests**

```ts
test('rejects unknown fields and keeps invoices view-only', () => {
  assert.throws(() => validateCanonicalRecord({
    version: 1,
    type: 'invoice',
    externalId: 'inv-1',
    payload: { number: '2026-1', total: 1200, mutateStatus: true },
  }), /unknown field: mutateStatus/);
});

test('fingerprint is independent of object key order', () => {
  assert.equal(
    fingerprintCanonicalRecord(customer({ name: 'ACME', city: 'Brno' })),
    fingerprintCanonicalRecord(customer({ city: 'Brno', name: 'ACME' })),
  );
});
```

- [ ] **Step 3: Run the protocol tests and confirm they fail**

Run: `npm test -- canonical.test.ts` from `connector/`
Expected: FAIL because the protocol module does not exist.

- [ ] **Step 4: Implement discriminated canonical types and explicit field allowlists**

Define `customer`, `contact`, `lead`, `project`, `employee_directory`, `invoice`, `payment`, and `custom_record` variants. Require `version: 1`, a non-empty `externalId`, `sourceSystem`, `sourceTable`, `fingerprint`, and JSON-safe payload. Normalize strings to NFC, timestamps to ISO-8601, and fingerprints to SHA-256 over recursively sorted canonical JSON.

- [ ] **Step 5: Write failing identity and signature tests**

```ts
test('persists a private key with owner-only permissions and verifies signatures', async () => {
  const identity = await loadOrCreateIdentity(join(tmp, 'identity.json'));
  const signed = signRequest(identity, requestFixture);
  assert.equal(verifyRequest(identity.publicKey, requestFixture, signed.signature), true);
  assert.equal((await stat(join(tmp, 'identity.json'))).mode & 0o077, 0);
});
```

- [ ] **Step 6: Implement local Ed25519 identity and request signing**

Use `node:crypto` `generateKeyPairSync('ed25519')`, export the public key as SPKI PEM and private key as PKCS8 PEM, create the file with mode `0o600`, and never include the private key in returned diagnostic objects.

- [ ] **Step 7: Run connector unit checks**

Run: `npm test && npm run lint && npm run build` from `connector/`
Expected: all protocol and identity tests pass; TypeScript emits `connector/dist` without errors.

- [ ] **Step 8: Commit the protocol boundary**

```bash
git add connector/package.json connector/package-lock.json connector/tsconfig.json shared/connectorProtocol.ts connector/src/protocol connector/src/security connector/test/protocol connector/test/security
git commit -m "feat(connector): define signed canonical protocol"
```

### Task 2: Add crash-safe state, outbox, and scheduling

**Files:**
- Create: `connector/src/state/atomicStore.ts`
- Create: `connector/src/state/outbox.ts`
- Create: `connector/src/state/checkpoints.ts`
- Create: `connector/src/scheduler.ts`
- Test: `connector/test/state/outbox.test.ts`
- Test: `connector/test/state/checkpoints.test.ts`
- Test: `connector/test/scheduler.test.ts`

**Interfaces:**
- Consumes: `IngestEnvelopeV1` and `IngestAckV1` from Task 1.
- Produces: `AtomicJsonStore<T>`, `FileOutbox.enqueue(event)`, `FileOutbox.pending()`, `FileOutbox.acknowledge(ids)`, `CheckpointStore.load(source)`, `CheckpointStore.commit(source, cursor)`, and `SyncScheduler.recordRun(result)`.

- [ ] **Step 1: Write failing atomicity and crash-recovery tests**

Create an acknowledged checkpoint, queue a second page, reconstruct all stores from disk without acknowledging it, and assert that the second page remains pending while the checkpoint still points to the first page.

- [ ] **Step 2: Run state tests and confirm missing modules fail**

Run: `npm test -- outbox.test.ts checkpoints.test.ts` from `connector/`
Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Implement atomic JSON storage and filesystem outbox**

Write to `<name>.tmp-<pid>-<nonce>`, call file sync, rename within the mounted directory, and sync the parent directory. Store each outbox envelope in `outbox/pending/<requestId>.json`; move acknowledged files to `outbox/acked/` and prune them after seven days.

- [ ] **Step 4: Write failing pause and retry tests**

```ts
test('pauses only after five consecutive run failures', async () => {
  for (let i = 0; i < 4; i++) assert.equal((await scheduler.recordRun(failed)).paused, false);
  assert.equal((await scheduler.recordRun(failed)).paused, true);
  assert.equal((await scheduler.recordRun(success)).consecutiveFailures, 0);
});
```

- [ ] **Step 5: Implement one-minute scheduler, exponential backoff, jitter, and pause state**

Keep record validation failures as `partial_failure`; count transport, authorization, source connection, and fatal mapping errors as run-level failures. Manual sync may run while automatic sync is paused but cannot overlap another run.

- [ ] **Step 6: Verify and commit durable state**

Run: `npm test && npm run lint` from `connector/`
Expected: crash recovery, deduplication, pause, and overlap tests pass.

```bash
git add connector/src/state connector/src/scheduler.ts connector/test/state connector/test/scheduler.test.ts
git commit -m "feat(connector): persist sync state and outbox"
```

### Task 3: Implement three read-only source adapters

**Files:**
- Create: `connector/src/adapters/types.ts`
- Create: `connector/src/adapters/sqlSafety.ts`
- Create: `connector/src/adapters/postgres.ts`
- Create: `connector/src/adapters/mysql.ts`
- Create: `connector/src/adapters/mssql.ts`
- Create: `connector/test/adapters/contract.ts`
- Create: `connector/test/adapters/postgres.test.ts`
- Create: `connector/test/adapters/mysql.test.ts`
- Create: `connector/test/adapters/mssql.test.ts`
- Create: `connector/test/fixtures/postgres.sql`
- Create: `connector/test/fixtures/mysql.sql`
- Create: `connector/test/fixtures/mssql.sql`
- Create: `connector/compose.test.yaml`

**Interfaces:**
- Produces: `SourceAdapter`, `SourceSchema`, `IncrementalCursor`, `IncrementalQuery`, `SourcePage`, and `createSourceAdapter(config)`.
- `readPage` returns stable ascending rows plus `nextCursor`; it never executes caller-provided SQL text.

- [ ] **Step 1: Define the adapter contract and synthetic fixtures**

Fixtures contain customers, leads, projects, employees, invoices, and payments, including two rows with identical `updated_at`, Unicode text, null values, and a source-deleted row marker. Each database account receives only connection, metadata-read, and SELECT privileges for fixture tables.

- [ ] **Step 2: Write a shared failing adapter contract**

The contract must assert schema inspection, identifier allowlisting, parameterized pagination, compound cursor correctness, deterministic ordering, connection cleanup, and rejection of table/column names absent from inspected metadata.

- [ ] **Step 3: Add read-only denial tests**

For each engine, issue direct `INSERT`, `UPDATE`, and `DELETE` attempts through the configured source account and assert permission-denied errors. Also assert `verifyReadOnly()` returns a structured success report only when all denial probes pass inside rolled-back transactions.

- [ ] **Step 4: Start the three database containers and confirm tests fail**

Run: `docker compose -f connector/compose.test.yaml up -d --wait` then `npm run test:integration` from `connector/`
Expected: FAIL because adapter implementations are absent.

- [ ] **Step 5: Implement PostgreSQL adapter**

Use `pg.Pool`, `information_schema`, `quote_ident` equivalent implemented from validated metadata, `$1` parameters, and `(updated_at, primary_key) > ($1, $2)` ordering. Set `default_transaction_read_only=on` for sessions in addition to database grants.

- [ ] **Step 6: Implement MySQL/MariaDB adapter**

Use `mysql2/promise`, `information_schema`, backtick identifiers only after allowlist validation, `?` parameters, and `SET SESSION TRANSACTION READ ONLY` where supported. Database grants remain the primary enforcement.

- [ ] **Step 7: Implement SQL Server adapter**

Use `mssql`, bracket identifiers only after allowlist validation, named parameters, `ORDER BY updated_at, primary_key`, and a login/user granted SELECT on the selected schema only.

- [ ] **Step 8: Run integration tests twice to prove restart/idempotent behavior**

Run: `npm run test:integration && npm run test:integration` from `connector/`
Expected: both runs pass; no fixture table contents change.

- [ ] **Step 9: Stop containers and commit adapters**

Run: `docker compose -f connector/compose.test.yaml down -v`.

```bash
git add connector/src/adapters connector/test/adapters connector/test/fixtures connector/compose.test.yaml
git commit -m "feat(connector): add read-only database adapters"
```

### Task 4: Build mapping, dry run, incremental sync, and connector API client

**Files:**
- Create: `connector/src/mapping/types.ts`
- Create: `connector/src/mapping/compileMapping.ts`
- Create: `connector/src/sync/syncEngine.ts`
- Create: `connector/src/api/client.ts`
- Create: `connector/src/config.ts`
- Test: `connector/test/mapping/compileMapping.test.ts`
- Test: `connector/test/sync/syncEngine.test.ts`
- Test: `connector/test/api/client.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 interfaces.
- Produces: `compileMapping(mapping, schema)`, `SyncEngine.dryRun()`, `SyncEngine.run()`, `ConnectorApi.enroll()`, `heartbeat()`, `ingest()`, `pollCommands()`, and `acknowledgeCommand()`.

- [ ] **Step 1: Write mapping allowlist and conversion tests**

Test text, number, boolean, ISO date/time, email, phone, currency, and enum lookup conversions. Reject arbitrary expressions, duplicate destination fields, missing external IDs, secrets in mapping values, unknown destination fields, and incompatible source types.

- [ ] **Step 2: Implement the mapping compiler**

Compile the versioned JSON mapping into pure conversion functions. Return field-level `MappingIssue` objects with safe source column names and error codes; do not include raw customer values.

- [ ] **Step 3: Write failing sync engine scenarios**

Cover first-run dry run, approval requirement, accepted initial import, source update, duplicate replay, per-row failure, network outage/recovery, archive reconciliation, mapping-version mismatch, restart recovery, and a minute-level incremental run with equal timestamps.

- [ ] **Step 4: Implement sync orchestration**

Do not persist a cursor until every accepted record for the page is acknowledged or safely retained in the outbox. A new mapping version invalidates approval. Run full reconciliation at a configurable daily hour while normal incremental sync remains every minute.

- [ ] **Step 5: Write request-client tests with a fake HTTP server**

Assert canonical request signing, retry only for network/`429`/`5xx`, no retry for validation/authorization errors, command expiry and one-time acknowledgement, body-size limits, and redacted errors.

- [ ] **Step 6: Implement connector API client and strict configuration parsing**

Support secret-file references for database credentials. Reject unknown configuration keys, invalid API origins, a sync interval below 60 seconds, and state paths outside the configured mounted directory.

- [ ] **Step 7: Verify and commit the sync core**

Run: `npm test && npm run lint && npm run build` from `connector/`.

```bash
git add connector/src/mapping connector/src/sync connector/src/api connector/src/config.ts connector/test/mapping connector/test/sync connector/test/api
git commit -m "feat(connector): synchronize mapped records safely"
```

### Task 5: Add connector runtime, health, and container packaging

**Files:**
- Create: `connector/src/health.ts`
- Create: `connector/src/main.ts`
- Create: `connector/Dockerfile`
- Create: `connector/.dockerignore`
- Create: `connector/compose.yaml`
- Create: `connector/config.example.json`
- Test: `connector/test/health.test.ts`
- Test: `connector/test/runtime.test.ts`

**Interfaces:**
- Consumes: connector configuration, scheduler, sync engine, and API client.
- Produces: process lifecycle and HTTP `GET /health` on container-local port `8787` with only `status`, `version`, `configured`, `paused`, and `lastHeartbeatAt`.

- [ ] **Step 1: Write runtime and health tests**

Assert startup rejects an unwritable state directory and incomplete configuration, SIGTERM stops scheduling and closes the adapter, health output contains no credential/row/mapping values, and readiness stays false until enrollment and signed heartbeat succeed.

- [ ] **Step 2: Implement runtime composition and graceful shutdown**

Run as a non-root user, bind health to the container network, execute at most one sync, and set a non-zero process exit code on fatal configuration errors.

- [ ] **Step 3: Build a multi-stage image and Compose template**

The final image contains production dependencies, compiled JavaScript, CA certificates, and a non-root user. Compose mounts `/volume1/docker/stavbaflow/config` read-only and `/volume1/docker/stavbaflow/state` read-write, declares a health check, uses `restart: unless-stopped`, and publishes no host port.

- [ ] **Step 4: Scan the built image for copied secrets and root execution**

Run: `docker build -t stavbaflow-connector:test connector` and inspect image history/config. Search extracted image metadata for fixture credentials and repository `.env` names. Assert configured user is non-root.

- [ ] **Step 5: Run the container against the synthetic test environment**

Expected: health becomes ready after fake enrollment, one dry run completes, database write probes remain denied, and stopping/restarting preserves outbox state.

- [ ] **Step 6: Commit runtime packaging**

```bash
git add connector/src/main.ts connector/src/health.ts connector/Dockerfile connector/.dockerignore connector/compose.yaml connector/config.example.json connector/test/health.test.ts connector/test/runtime.test.ts
git commit -m "feat(connector): package Synology runtime"
```

### Task 6: Implement server-side connector authentication and HTTP boundaries

**Files:**
- Create: `api/_connector/http.ts`
- Create: `api/_connector/auth.ts`
- Create: `api/_connector/signature.ts`
- Create: `api/_connector/supabaseAdmin.ts`
- Create: `api/_connector/validation.ts`
- Create: `api/connector-register.ts`
- Create: `api/connector-heartbeat.ts`
- Create: `api/connector-ingest.ts`
- Create: `api/connector-commands.ts`
- Test: `tests/connector-signature.test.ts`
- Test: `tests/connector-api.test.ts`

**Interfaces:**
- Consumes: protocol JSON shapes from `shared/connectorProtocol.ts`; server validation must not import UI code.
- Produces: `verifyConnectorRequest(req, rawBody)`, `requireConnectorScope(identity, scope)`, and four connector-facing handlers.

- [ ] **Step 1: Add failing signature and replay tests**

Test valid Ed25519 signature, modified body, timestamp older than five minutes, future timestamp beyond allowed skew, reused request ID, revoked identity, wrong scope, and claimed company different from registered company.

- [ ] **Step 2: Implement raw-body hashing and constant-shape external errors**

Preserve exact request bytes for the body hash. Return safe codes such as `CONNECTOR_SIGNATURE_INVALID`, `CONNECTOR_REPLAYED`, and `CONNECTOR_REVOKED`; never return whether a connector ID exists.

- [ ] **Step 3: Add failing API method, size, and schema tests**

Reject non-POST methods, bodies over the configured limit, more than the maximum batch count, unknown entity versions/fields, and an envelope containing mixed connector/company/mapping identities before calling Supabase.

- [ ] **Step 4: Implement registration, heartbeat, ingestion, and command handlers**

Registration consumes a one-time enrollment code and stores the public key. Heartbeat updates operational metadata. Ingestion calls only the reviewed `app_ingest_connector_batch` RPC. Commands return unexpired unacknowledged commands for the same connector and acknowledge them idempotently.

- [ ] **Step 5: Register local development middleware routes**

Modify `vite.config.ts` to route the eight connector endpoints through the existing API middleware without logging request bodies.

- [ ] **Step 6: Run root checks and commit server boundaries**

Run: `npm test && npm run lint && npm run build` from the repository root.

```bash
git add api/_connector api/connector-register.ts api/connector-heartbeat.ts api/connector-ingest.ts api/connector-commands.ts tests/connector-signature.test.ts tests/connector-api.test.ts vite.config.ts
git commit -m "feat(api): authenticate tenant-bound connectors"
```

### Task 7: Propose and verify the staging Supabase contract

**Files:**
- Create: `supabase/staging/20261004_connector_contract.sql`
- Create: `supabase/tests/connector_authorization.sql`
- Create: `tests/connector-staging-contract.test.ts`
- Modify: `docs/schema-contract-matrix.md`
- Modify: `docs/staging-contract-runbook.md`

**Interfaces:**
- Produces: `app_create_connector_enrollment`, `app_register_connector`, `app_ingest_connector_batch`, `app_connector_heartbeat`, `app_get_connector_commands`, `app_ack_connector_command`, owner mapping/status/command RPCs, and the six connector tables named in the spec.

- [ ] **Step 1: Write static contract tests before SQL**

Assert all new tables enable RLS, browser roles receive no direct table writes, service functions set `search_path`, connector functions validate registered tenant identity, enrollment codes are hashed/expiring/single-use, and grants match owner/service/public roles exactly.

- [ ] **Step 2: Write the staging-only SQL contract**

Use UUID primary keys, tenant foreign keys, unique `(company_id, connector_id, entity_type, external_id)`, unique request IDs per connector, mapping version constraints, and audit events. `app_ingest_connector_batch` applies field ownership, fingerprint idempotency, archive semantics, and row-level error results without allowing a connector-supplied company override.

- [ ] **Step 3: Add SQL authorization scenarios**

Create two synthetic companies, owners, an employee, two connector identities, and synthetic external records inside a rolled-back transaction. Assert cross-company status, mapping, commands, reads, ingest, archive, and replay attempts fail. Assert employees cannot manage connectors or see integration diagnostics.

- [ ] **Step 4: Verify locally against an ephemeral Supabase/PostgreSQL environment**

Run the SQL contract and authorization assertions without production credentials. Expected: all assertions pass and transaction rollback leaves no rows.

- [ ] **Step 5: Review staging metadata before any application**

Record expected functions, argument types, `SECURITY DEFINER` classifications, fixed search paths, grants, RLS policies, and indexes in `docs/schema-contract-matrix.md`. The actual isolated-staging application remains a separately reviewed operator step.

- [ ] **Step 6: Commit the proposed database contract**

```bash
git add supabase/staging/20261004_connector_contract.sql supabase/tests/connector_authorization.sql tests/connector-staging-contract.test.ts docs/schema-contract-matrix.md docs/staging-contract-runbook.md
git commit -m "feat(staging): define connector ingestion contract"
```

### Task 8: Add owner enrollment, mapping, status, and command APIs

**Files:**
- Create: `src/app/connectorContract.ts`
- Create: `src/app/connectorClient.ts`
- Create: `api/connector-enroll.ts`
- Create: `api/connector-status.ts`
- Create: `api/connector-mapping.ts`
- Create: `api/connector-command.ts`
- Test: `tests/connector-owner-api.test.ts`
- Test: `tests/connector-contract.test.ts`

**Interfaces:**
- Consumes: canonical connector status and command types from `shared/connectorProtocol.ts`.
- Produces: `ConnectorSummary`, `ConnectorMappingV1`, `ConnectorStatus`, `createEnrollment()`, `getConnectorStatus()`, `saveMapping()`, and `sendConnectorCommand()`.

- [ ] **Step 1: Write owner API authorization tests**

Assert missing/invalid session returns 401, employee returns 403, owner A cannot reference company B, admin access is explicit, enrollment expires in 15 minutes, raw enrollment code appears only in its creation response, and revoke is immediately effective.

- [ ] **Step 2: Implement a shared owner authorization helper**

Validate the Supabase bearer session with the anon client, then resolve active `app_members` membership with the server client. Do not trust `companyId`, role, or connector ID from the browser without this lookup.

- [ ] **Step 3: Implement enrollment, status, mapping, and command handlers**

Validate mapping fields and source identifiers, require dry-run command after each mapping version, create expiring single-use commands, and return only safe operational fields. Never return public keys, request signatures, raw row failures, or source credentials to the UI.

- [ ] **Step 4: Add the typed browser client**

Get the active access token from Supabase, use same-origin API paths, parse stable error codes, and expose abortable calls so route changes do not update unmounted components.

- [ ] **Step 5: Run checks and commit owner contracts**

Run: `npm test && npm run lint && npm run build`.

```bash
git add src/app/connectorContract.ts src/app/connectorClient.ts api/connector-enroll.ts api/connector-status.ts api/connector-mapping.ts api/connector-command.ts tests/connector-owner-api.test.ts tests/connector-contract.test.ts
git commit -m "feat(integrations): manage connector enrollment and mapping"
```

### Task 9: Build the truthful owner integration interface

**Files:**
- Create: `components/integrations/ConnectorSetup.tsx`
- Create: `components/integrations/ConnectorMapping.tsx`
- Create: `components/integrations/ConnectorStatus.tsx`
- Modify: `src/pages/owner/Integrations.tsx`
- Modify: `src/index.css`
- Test: `tests/connector-ui.test.ts`
- Test: `tests/integration-honesty.test.ts`

**Interfaces:**
- Consumes: browser client and contract from Task 8.
- Produces: the owner flow for install, enroll, map, dry run, approve, sync, retry, pause/resume, update warning, and revoke.

- [ ] **Step 1: Write failing static render and state tests**

Cover all states: `not_configured`, `awaiting_enrollment`, `mapping_required`, `dry_run_required`, `ready`, `running`, `success`, `partial_failure`, `paused`, `outdated`, and `revoked`. Assert no state displays invented counts, sample customer rows, or a successful connection when the API is unavailable.

- [ ] **Step 2: Build the setup component**

Show database choice, Compose bundle download, one-time enrollment code with expiry, and heartbeat verification. Clearly state that credentials stay on the NAS and the source database is read-only.

- [ ] **Step 3: Build mapping and dry-run components**

Render inspected source table/column metadata, destination field selectors, validation issues, masked preview opt-in, mapping version, counts, and owner approval. Require explicit review before initial import.

- [ ] **Step 4: Build status and operations component**

Show last/next sync, processed/changed/failed counts, connector/mapping versions, pause reason, and safe per-field errors. Buttons call typed commands and disable while a command is pending.

- [ ] **Step 5: Integrate with the existing CSV pilot page**

Keep controlled CSV import available. Replace the current post-pilot message with the new verified connector flow only when server configuration advertises the connector feature; otherwise show an honest unavailable state.

- [ ] **Step 6: Verify responsive visual behavior in the browser**

Check desktop and mobile enrollment, mapping, partial failure, pause, and revoke states. Confirm keyboard focus, button labels, error announcements, contrast, no horizontal overflow, and zero browser console errors.

- [ ] **Step 7: Run root verification and commit the interface**

Run: `npm test && npm run lint && npm run build`.

```bash
git add components/integrations/ConnectorSetup.tsx components/integrations/ConnectorMapping.tsx components/integrations/ConnectorStatus.tsx src/pages/owner/Integrations.tsx src/index.css tests/connector-ui.test.ts tests/integration-honesty.test.ts
git commit -m "feat(integrations): add Synology connector workspace"
```

### Task 10: Add multi-architecture CI, release, updater, and rollback

**Files:**
- Create: `.github/workflows/connector-verify.yml`
- Create: `.github/workflows/connector-publish.yml`
- Create: `connector/scripts/install.ps1`
- Create: `connector/scripts/update.ps1`
- Create: `connector/test/updater.test.ts`
- Create: `connector/release-manifest.schema.json`

**Interfaces:**
- Produces: versioned `ghcr.io/svobonek-lab/stavbaflow-connector:<semver>`, immutable digest metadata, stable manifest, and a host-side updater that never mounts `/var/run/docker.sock`.

- [ ] **Step 1: Write updater decision and rollback tests**

Mock Docker commands and manifest responses. Assert no-op at current digest, pull and health success, failed container health, missing signed heartbeat, interrupted pull, unavailable registry, explicit pin, disabled auto-update, and rollback to the exact prior digest.

- [ ] **Step 2: Implement install and update scripts**

Validate DSM paths, write no secret values to output, preserve config/state mounts, store current/previous digest atomically, limit health wait, and restore the prior Compose image digest on failure.

- [ ] **Step 3: Add PR verification workflow**

Use Node 24, `npm ci` in root and connector, root checks, connector checks, three service containers, Buildx builds for amd64/arm64, and an image vulnerability scanner that fails on unresolved critical vulnerabilities. Use least-privilege read permissions.

- [ ] **Step 4: Add main-only publishing workflow**

Grant `contents: read` and `packages: write`, authenticate with `GITHUB_TOKEN`, publish version and commit-SHA tags, resolve the digest, and update the stable manifest only after all verification jobs succeed. Never publish from pull requests or forks.

- [ ] **Step 5: Prove workflow syntax and local updater behavior**

Run the workflow linter available in the repository environment and execute `connector/test/updater.test.ts`. Build both platforms without pushing and inspect the manifest.

- [ ] **Step 6: Commit release automation**

```bash
git add .github/workflows/connector-verify.yml .github/workflows/connector-publish.yml connector/scripts connector/test/updater.test.ts connector/release-manifest.schema.json
git commit -m "ci(connector): verify and publish Synology images"
```

### Task 11: Run tenant-isolated staging and full browser acceptance

**Files:**
- Create: `scripts/connector-staging-e2e.mjs`
- Create: `scripts/connector-preview-e2e.mjs`
- Modify: `package.json`
- Modify: `docs/staging-pilot-verification-20261001.md`
- Modify: `docs/audits/pilot-function-audit-2026-10-04.md`

**Interfaces:**
- Consumes: deployed staging contract, Vercel preview, and synthetic connector identities.
- Produces: repeatable `npm run test:connector:staging` and `npm run test:connector:preview` evidence with no customer rows or secrets in output.

- [ ] **Step 1: Write the two-company staging test**

Provision two synthetic companies and identities through reviewed staging helpers. Enroll connector A/B, send signed dry-run and ingest envelopes, attempt forged cross-company actions, verify owner/employee visibility, revoke A, and prove A can no longer ingest. Always remove synthetic state in a guarded cleanup path.

- [ ] **Step 2: Add source and retry scenarios**

Run the connector against each local source engine, then exercise initial import, equal-timestamp update, duplicate, outage/recovery, invalid permissions, malformed row, archive, mapping change, and write denial.

- [ ] **Step 3: Write the deployed-preview browser flow**

Use the owner account to create enrollment, show waiting state, attach a synthetic connector, inspect metadata, map lead/project fields, run dry run, approve import, confirm visible imported data, trigger sync, show partial failure, retry, pause/resume, revoke, logout, and login again. Assert API responses and browser state agree after reload.

- [ ] **Step 4: Run all repository and connector checks**

Run from root:

```bash
npm ci
npm test
npm run lint
npm run build
cd connector
npm ci
npm test
npm run lint
npm run build
npm run test:integration
```

Expected: every command exits 0; no source fixture mutates; no test contacts production.

- [ ] **Step 5: Record exact evidence and remaining release boundary**

Update audit documents with commit, CI run, preview URL, tested image digest, database engines, staging project reference, synthetic tenant test result, browser result, security-advisor result, known limitations, and an explicit statement that production enablement was not performed.

- [ ] **Step 6: Commit acceptance automation and evidence**

```bash
git add scripts/connector-staging-e2e.mjs scripts/connector-preview-e2e.mjs package.json package-lock.json docs/staging-pilot-verification-20261001.md docs/audits/pilot-function-audit-2026-10-04.md
git commit -m "test(connector): verify isolated pilot flow"
```

### Task 12: Publish operator documentation and prepare the final reviewable release PR

**Files:**
- Create: `docs/synology-connector-install.md`
- Create: `docs/synology-connector-operations.md`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `WORKPLAN.md`

**Interfaces:**
- Produces: install, upgrade, rollback, revoke, rotate, pause, recovery, backup, and support procedures tied to the tested release.

- [ ] **Step 1: Write the installation runbook**

Document supported Synology architectures, Container Manager prerequisites, source read-only users for each engine, outbound destinations, folder permissions, Compose import, one-time enrollment, mapping, dry run, approval, and success checks. In copyable examples, use clearly labelled values such as `CUSTOMER_DB_HOST` only where the installer must supply a value.

- [ ] **Step 2: Write the operations and incident runbook**

Document health/status codes, log redaction, retry, five-failure pause, mapping changes, key rotation, revoke, state backup/restore, connector replacement, update pinning, failed-update rollback, compromised NAS response, and escalation data that excludes customer rows and credentials.

- [ ] **Step 3: Update public configuration examples and project status**

Add only variable names and safe examples to `.env.example`. Update README and WORKPLAN to distinguish implemented, verified staging, pilot-only, and excluded bidirectional functionality.

- [ ] **Step 4: Perform final security and secret review**

Review every staged file, run repository secret scanning, dependency audit, image vulnerability scan, RLS/grant metadata review, and Security Advisor. Resolve every critical/high code or image issue or document a specific upstream exception that prevents release.

- [ ] **Step 5: Perform final browser verification on the exact PR head**

Repeat owner integration setup and employee isolation checks on the exact Vercel preview produced from the final commit. Save only safe evidence and confirm zero console errors.

- [ ] **Step 6: Commit documentation and open a draft PR**

```bash
git add docs/synology-connector-install.md docs/synology-connector-operations.md .env.example README.md WORKPLAN.md
git commit -m "docs: add Synology connector operations guide"
git push -u origin feature/connector-release-pilot
gh pr create --draft --base main --title "feat: add read-only Synology database connector" --body-file C:/Temp/stavbaflow-connector-pr.md
```

The PR description must state tested engines, tenant-isolation evidence, image digest, preview URL, production actions not performed, source write-denial proof, and exact remaining operator decisions. Do not enable auto-merge or merge the PR.
