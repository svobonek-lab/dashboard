# StavbaCore Staging schema drift — 2026-10-30

## Capture

The metadata-only workflow [41112184393](https://github.com/svobonek-lab/dashboard/actions/runs/41112184393) completed on 2026-10-30 at `2026-10-30T19:06:32Z`. It captured PostgreSQL catalog metadata, migration history, Storage metadata, grants, function signatures, and sanitized Auth-hook configuration from StavbaCore Staging (`xwzweltjvreqhjpbjrxa`). It did not read application rows or modify staging or production.

The complete snapshot is [stavbacore-staging-20261030.json](../supabase/schema-snapshots/stavbacore-staging-20261030.json), the default input to `scripts/verify-schema-snapshot.mjs`. The machine-readable comparison is [stavbacore-staging-schema-drift-2026-10-30.json](stavbacore-staging-schema-drift-2026-10-30.json).

## Current inventory

| Metadata | Staging |
|---|---:|
| Relations | 33 |
| Columns | 340 |
| RLS policies | 63 |
| Functions | 61 |
| Table grants | 490 |
| Column grants | 25 |
| Storage buckets | 2 private buckets (`crm-files`, `lead-files`) |
| Custom access-token hook | Enabled and configured as `app_tenant_access_token_hook` |
| Migration history entries | 13 |

The 13 version IDs recorded by staging differ from all 13 legacy IDs in `supabase/migrations`. The source-versus-live comparison is also incomplete for `supabase/staging`; neither mismatch justifies replaying migration files as a batch. The comparison counts are conservative name-based checks, not proof that every differing source object is absent in equivalent form or safe to deploy. The JSON enumerates each extracted difference for review.

## Live contract observations

- `supabase/staging/20260930_import_worker.sql` and the public-intake SQL were applied and previously exercised by staging acceptance runs. The five-argument `app_import_leads` contract is present; the old four-argument signature was removed.
- `app_public_intake_events` and the hardened `app_submit_public_lead` RPC are present. Staging abuse/retry requests and public-intake load acceptance passed. Synthetic company A was enabled for the form. `privacy_url=https://example.test/privacy` is a test-only placeholder required by the database constraint.
- **Notes and files are already present on staging:** the relation is `app_notes` (not the proposed `app_lead_notes` name), and `app_lead_files` exists with RLS. Both `crm-files` and `lead-files` are private buckets. The snapshot includes tenant-scoped `app_lead_files_storage_{select,insert,delete}` policies. The running UI and storage path contract still need a successful live round trip before describing attachments as accepted.
- The snapshot contains 13 staging migration-history IDs that differ from the repository's 13 legacy migration IDs. Do not use the legacy source directory as a deployment queue; reconcile individual contracts first.

The schema extractor reports these source-declared objects as missing by exact name:

| Source SQL directory | Missing tables | Missing columns | Missing policies | Missing functions |
|---|---:|---:|---:|---:|
| `supabase/migrations` | 9 | 75 | 35 | 11 |
| `supabase/staging` | 9 | 88 | 15 | 39 |

The historical migration set models `organizations/users/leads`, unlike the live `app_*` schema; it is not a safe batch to apply. The staging directory includes contracts that may be unapplied or represented under a different name/signature. Treat the report as a reconciliation list, not deployment authorization.

## Remaining gates

1. Run the updated staging E2E Storage scenario against the exact branch Preview. It creates a synthetic company-B file and metadata row, tests owner-A/employee-A denial and owner-B access, and deletes the exact fixture in `finally`.
2. Review the extracted staging contract differences individually. Preserve the existing migration history and do not apply legacy SQL in bulk.
3. Production remains strictly read-only.
