# BYODB full-domain source-of-truth design

Date: 2026-10-27

Status: implementation design; no deployment approval or release evidence

## Goal and boundary

In BYODB mode, company profile, leads, operational employees, projects, lead
notes and lead files must be read from and written to the approved customer
source. Public intake, AI intake and CSV commit must use the same durable source
write path. Managed Cloud retains its existing behavior. Authentication,
membership, invitations, tenant routing and connector control state remain in
StavbaFlow Cloud; operational employees are not Auth users.

The current `ByodbRepository` and `app_*` RPCs cover only company and lead
records. Do not enable the BYODB deployment flag until all routes above have
source-backed implementations and staging acceptance proves them. A partial
mapping must fail activation with an explicit missing-domain explanation.

## Domain contracts

- Add source mappings for `employee_directory`, `project`, `lead_note`, and
  `lead_file` alongside `company` and `lead`. Each mapping is independently
  versioned, approved by the owner, bound to an inspected table and stable
  external key, and scoped to the enrolled connector's company.
- The employee directory maps name, email, specialization, capacity and
  active status. Identity and role still come from `app_members`. An employee
  may update only the same assigned lead status fields allowed today; mapping
  an operational employee row never grants application access.
- Projects map title, description, status, customer/lead external references,
  dates and budget. References must resolve within the same connector and
  company before writes are queued or projected.
- Notes map a stable note key, lead external key, author identity, body and
  timestamp. Cloud Auth user IDs may be stored as attributed metadata, but a
  note's content and lifecycle are authoritative in the customer source.
- Files use two parts: mapped source metadata (stable key, lead reference,
  relative object path, name, MIME, size and SHA-256) and binary content in a
  customer-controlled NAS object directory. Never put SQL passwords, absolute
  NAS paths or file bytes in browser state or the read projection. An encrypted
  temporary transfer object may relay upload/download while the outbound
  connector is offline; it is not a successful file save. The connector must
  verify size and digest, atomically place the file under its configured
  directory, commit metadata to source SQL, then acknowledge. Download is
  served only through an authenticated, tenant-scoped, short-lived transfer.
  Temporary transfer objects are deleted on success or bounded expiry.

## Write path and user-visible result

All interactive and automated writes create the existing tenant-bound,
idempotent operation envelope with entity, action, mapping version, stable
external ID, expected source version and allowlisted payload. The connector
applies a parameterized single-row source transaction before acknowledging.
Only `applied` plus a matching updated projection is success. Pending,
conflict and failure are distinct states in owner, employee, public and batch
flows. The server cannot silently fall back to a Supabase business-row write.

Public intake derives the company from the published intake key, not the
request body, and reuses its idempotency key. It returns a receipt marked
pending until the connector commits the lead. AI intake must pass the same
company and consent checks before queueing. CSV dry-run remains read-only;
commit queues each validated row with a deterministic batch/row key, reports
per-row results, and rollback queues conditional source deletes only for rows
created by that batch and still at the recorded source version. No route may
report an imported row as saved while the connector is offline.

## Release and acceptance

1. Update the protocol, schema scanner, mapping UI, API validators, connector
   adapters, `app_*` SQL proposal and browser repository together for each
   domain. Source tables remain customer-owned; never run customer DDL.
2. Use disposable PostgreSQL, MariaDB and SQL Server fixtures to prove each
   CRUD path, create replay, version conflict, cross-company denial, dangling
   reference rejection and rollback safety. Check file content hash and cleanup.
3. Run staging-only metadata preflight, two-company acceptance, authenticated
   owner Playwright, public/AI/CSV acceptance and NAS file round trip. Keep
   production strictly read-only and never auto-apply SQL.
4. Publish only from a successful acceptance run for the exact merged commit;
   record the immutable image digest. Set BYODB flags only after verifying the
   Preview points to isolated staging and the image digest is installed.

The six skipped database fixture tests, current Actions billing block, absent
owner browser session, and absent release digest remain open evidence gaps.
