# StavbaFlow BYODB source-of-truth design

Date: 2026-10-25

Status: implementation authorized by the BYODB goal and the owner's choice
of true BYODB

## Intent

Let a company keep its business database on its Synology NAS or existing
server while using the StavbaFlow owner and employee interface. In BYODB
mode, the company's mapped database is the authority for mapped company and
lead fields, including edits made in StavbaFlow. Managed Cloud keeps the
current Supabase behavior.

The current connector only reads the customer database and stores a cloud
projection. That behavior alone does not satisfy true BYODB. This design adds
a narrow, durable write-command path while preserving the current outbound
connector topology; the NAS opens no inbound port and the browser never
connects to customer SQL.

## Product behavior

- The owner chooses Managed Cloud or Company database in the existing owner
  Integrations page. The current FSD location is
  `src/pages/owner/integrations/ui/Integrations.tsx`; the existing connector
  slices live under `src/features/manage-integrations/`.
- Managed Cloud continues to use the existing Supabase repository.
- Company database supports PostgreSQL, MariaDB/MySQL, and Microsoft SQL
  Server through the existing connector. Mapped company and lead fields are
  read from that database and mirrored into the tenant's cloud read model.
- In Company database mode, create, update, status-change, and delete requests
  for mapped fields are durable operations. The connector applies each
  operation to the source database before the application reports success.
  A disconnected connector leaves the operation visibly pending; the UI must
  never imply that a pending write has been saved.
- The cloud mirror is a read model and delivery/control plane. Its `company_id`
  is derived from authenticated membership or the registered connector, never
  from a caller-supplied tenant value. A customer database remains the source
  of truth for fields in the approved mapping.
- Unmapped fields, authentication, membership, invitation state, connector
  management, and audit/control-plane data remain in the existing StavbaFlow
  services. They must not be advertised as customer-database-backed.
- Switching modes is owner-only. Company database mode cannot activate until
  the connector is enrolled, the source schema is inspected, required fields
  are mapped, dry-run passes, and a non-mutating permission probe succeeds.
  A source write is never used as a connection probe.
- Create retries use the mapping's stable external key. App-created rows are
  enabled only when the inspected key supports a client-supplied stable value;
  otherwise create is disabled with a clear explanation. An integer identity
  column is never toggled or bypassed to force an insert.
- An owner/employee delete action retains the current hard-delete semantics
  and is queued to the source database. A source-side deletion discovered by
  reconciliation archives the cloud projection instead of hard-deleting a
  second copy or unrelated application state.
- Optimistic concurrency uses the saved source timestamp when available and
  otherwise compares the current canonical fingerprint with the last synced
  fingerprint. A mismatch is a conflict; the connector never silently uses
  last-write-wins.

## Architecture and contracts

1. The owner UI uses the existing FSD integration feature. A pure package
   builder creates a ZIP containing the Synology compose file and a
   `config.json` with database driver, approved image digest, API URL, and
   secret-file paths. It never contains the customer's SQL password. A
   generated connector secret is shown/downloaded once and is not saved in
   browser storage or logs. Package generation is disabled when no reviewed
   immutable image digest is configured.
2. The owner saves an explicit versioned mapping of source schema/table/key
   and source columns to allowlisted canonical company and lead fields. The
   UI suggests matches from column names and SQL types; the owner reviews
   every target. Sample row values are never requested for schema discovery.
3. A per-connector 256-bit HMAC-SHA256 secret signs every connector request
   over method, path, normalized timestamp, request ID, and SHA-256 body hash.
   The server encrypts it at rest with AES-256-GCM using a deployment-only
   `CONNECTOR_SECRET_ENCRYPTION_KEY`, returns it only for one-time package
   delivery, compares MACs in constant time, enforces a short timestamp
   window, and reserves request IDs to reject replay. Rotation revokes the
   old secret after a new registration succeeds. Missing encryption
   configuration fails closed.
4. Authenticated app writes enter a tenant-scoped durable cloud operation
   queue. The connector polls over outbound HTTPS, verifies its operation
   scope, checks the saved mapping version, and executes only parameterized
   single-row mutations against identifiers present in the last inspected
   schema. It applies optimistic concurrency using the source key and
   `updated_at` when available, otherwise the synced canonical fingerprint.
   Unknown fields, stale versions, conflicts, malformed payloads, and
   cross-tenant IDs fail closed.
5. The connector retains its durable local file Outbox and compound
   `(updated_at, primary_key)` cursor. HMAC-signed acknowledgements and
   idempotency keys make retries safe across network loss and restarts.
   Where no update timestamp exists, the connector keeps ordered primary-key
   scans and fingerprint reconciliation. A create's stable external key is
   also the source-side deduplication key, so replay after a lost acknowledgement
   cannot create a second row.
6. Connector-sourced data is validated by strict Zod contracts before the
   server stores the cloud read projection. Tenant identity comes from the
   authenticated connector record. Customer row values are not written to
   logs or included in status/error summaries.

## Security and operational constraints

- Do not create another Supabase project, write to the production-shared
  Supabase project, apply a migration, or enable BYODB in a deployment as
  part of this implementation.
- Keep the current release gate: no downloadable runnable package without a
  reviewed immutable connector image digest. Source code and SQL proposals
  may be prepared and tested only with synthetic local fixtures.
- The customer controls the source database and must grant only the mapped
  SELECT/INSERT/UPDATE/DELETE permissions required by enabled operations.
  No DDL, arbitrary SQL, browser SQL credentials, or SQL expression mapping
  is supported.
- The connector reports readiness only after HTTPS authentication, source
  connectivity, schema inspection, and a zero-row permission check. It does
  not mutate a real customer row as a health check.
- Preserve tenant isolation, current delete semantics, consent flows,
  approval gates, and audit history. A write is successful only after source
  commit and cloud acknowledgement; timeout leaves an idempotently queryable
  pending operation.

## UI design direction

Reuse the existing StavbaFlow workspace tokens and panel styles so the new
flow feels native to the owner dashboard. Keep the page left-aligned and
operational: mode choice first, then a vertical setup sequence, then a compact
status panel. The distinctive element is a clear source-of-truth strip that
shows where edits are saved and whether the source is reachable.

```text
┌ Databázový režim ──────────────────────────────────────────┐
│  ● Managed Cloud       ○ Firemní databáze                  │
│  Změny se ukládají do Supabase.                            │
└───────────────────────────────────────────────────────────┘

┌ Připojení firmy ───────────────────────────────────────────┐
│  Databáze → Zabezpečení → Mapování → Kontrola → Stav       │
│  [typ + metadata]  [jednorázový balíček]  [náhled polí]     │
└───────────────────────────────────────────────────────────┘

┌ Stav synchronizace ────────────────────────────────────────┐
│  Připojeno · naposledy před 20 s · 2 změny čekají          │
└───────────────────────────────────────────────────────────┘
```

Use sentence-case labels, explicit pending/conflict states, visible focus,
responsive stacking, and no decorative animation. A successful connection
must state that business writes are applied to the company's database.

## Acceptance evidence

- UI mode and wizard tests prove Managed Cloud behavior remains unchanged,
  invalid transitions are blocked, mapping is reviewed, package contents are
  correctly escaped, and secrets are absent from page state after download.
- Signature tests cover correct HMAC, tampering, wrong path/tenant, expired
  timestamps, replay, rotation, and unavailable encryption key.
- Adapter contract tests run against disposable PostgreSQL, MySQL/MariaDB,
  and SQL Server fixtures; writes affect only an explicitly mapped row and
  rollback/conflict paths do not change source data.
- `tests/connector-api.test.ts` proves enrollment, signed heartbeat, mapping,
  operation queue, source mutation, signed ingest, tenant-derived projection,
  and idempotent replay end to end using synthetic fixtures.
- Root and connector tests, type checks, lint, and builds pass. No production
  Supabase access or customer database is used.
- `docs/synology-connector-install.md` gives a truthful three-action setup,
  and separately explains the credentials the company must enter locally on
  the NAS.

## Known release boundary

The repository currently has no separate isolated staging Supabase project,
no staging acceptance run, and no published connector image digest. The
implementation can be tested locally with disposable synthetic fixtures,
but its owner UI must keep package download and mode activation disabled
until the existing staging prerequisites and acceptance workflow pass.
