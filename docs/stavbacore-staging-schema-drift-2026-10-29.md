# StavbaCore Staging schema drift — 2026-10-29

## Capture

Read-only metadata was captured at `2026-10-29T17:14:50.516334Z` from staging project `xwzweltjvreqhjpbjrxa`. The query read PostgreSQL catalogs, migration history, Storage bucket/policy metadata, and sanitized Auth-hook configuration. It did not select application rows, execute customer RPCs, or change staging or production.

The complete snapshot is [stavbacore-staging-20261029.json](../supabase/schema-snapshots/stavbacore-staging-20261029.json). The exact machine-readable comparison of every missing relation, column, policy, function, and migration version is [stavbacore-staging-schema-drift-2026-10-29.json](stavbacore-staging-schema-drift-2026-10-29.json).

## Current inventory

| Metadata | Staging |
|---|---:|
| `public.app_*` relations | 29 |
| columns | 302 |
| RLS policies | 54 |
| functions | 57 |
| table grants | 435 |
| column grants | 25 |
| Auth custom access-token hook | enabled and readable |
| Storage bucket | private `crm-files` |

## Migrations do not describe this staging database

Staging has 13 recorded migration versions. The repository also has 13 numbered migrations, but none of their version IDs match. The full actual and expected lists are in the JSON comparison. This is a lineage mismatch, not evidence that the repository SQL should be replayed: the numbered files describe legacy `organizations`, `users`, `leads`, `employees`, and `projects` tables, while current staging uses `app_*` relations.

The presence-only comparison against `supabase/migrations` reports 10 missing tables, 76 missing columns, 35 missing policies, and 12 missing functions. These are legacy contracts. Do not apply them to staging as a batch.

## Missing from the current `supabase/staging` proposals

The parser compared every SQL file under `supabase/staging` with catalog names and columns. It reports 13 missing tables, 124 missing columns, 23 missing policies, and 41 missing functions. The JSON file lists every object in these categories. The most relevant gaps for prompts 1–8 are:

- `app_public_intake_events` and `app_submit_public_lead` are absent, and the expected `lead_id` is missing. Public intake remains disabled; its abuse-resistance tests are not live acceptance.
- `app_lead_notes`, `app_lead_files`, and their policies/functions are absent. Staging's private bucket is named `crm-files`, whereas the proposal and app contract use `lead-files`. Keep notes and file UI disabled until this schema and Storage mapping are separately reviewed.
- `app_imports` exists but lacks the import fingerprint/provenance fields; `app_leads` lacks `import_fingerprint` and `source_record_id`. The `app_import_leads` signature exists, but the metadata-only snapshot deliberately does not include its body. The E2E CSV commit returned HTTP 502 `IMPORT_WORKER_ERROR`; the precise database exception is not exposed by the endpoint. The worker passed isolated PostgreSQL idempotency, inactive-tenant, rollback, and grant checks, but is not applied in staging.
- `app_email_outbox_runs`, `app_lead_events`, paid-registration, and platform-support tables/functions declared in staging SQL are also absent. See the JSON list for the complete contract inventory.

## Interpretation and next gate

The CI verifier now reads the normalized metadata object and reports the exact legacy migration/history and current staging-contract gaps. Presence checks do not certify policy expressions, grants, function bodies, or tenant behavior; the snapshot retains those catalog details for review. The schema CI gate should remain red until the migration history and schema source of truth are reconciled. Staging changes still require the specific SQL to be reviewed, verified in disposable PostgreSQL, and explicitly approved before application. Production was not accessed for writes.
