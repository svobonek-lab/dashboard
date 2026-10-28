# StavbaCore Staging metadata observation — 2026-10-28

**Source:** read-only SQL Editor metadata queries in Supabase project `xwzweltjvreqhjpbjrxa`, first captured `2026-10-28T08:01:58.724499Z`, then count/bucket/history rechecked `2026-10-28T09:29:54.515365Z`; Auth Hooks page read at the first session. No customer rows were selected. No writes or migrations were run.

## Owner membership contract

The application converts a signed-in user to a workspace identity in `src/app/appSchemaIdentity.ts`; the user-facing missing-membership error is raised in `src/app/authWorkspaceUser.ts` and `src/app/providers/OrganizationProvider.tsx`. The live staging `app_members` relation has exactly `company_id uuid NOT NULL`, `user_id uuid NOT NULL`, `name text NOT NULL`, `email text NOT NULL`, `role text NOT NULL`, and `active boolean NOT NULL DEFAULT true`. Its active JWT boundary requires `company_id = app_private.jwt_tenant_id()` and a non-null `app_role(company_id)`. The seed script creates the active owner/employee membership shape. No account was seeded by this read-only audit.
## Current inventory

- 28 `public.app_*` relations; all have RLS enabled, none has FORCE ROW LEVEL SECURITY.
- 289 columns, 54 policies, 53 functions, 232 table-grant entries, and 1,487 column-grant entries.
- Private Storage bucket: `crm-files`. The repository app and proposed lead-files contract use bucket `lead-files`, so a name mismatch must be reconciled before uploads are enabled. Three `storage.objects` policies are present: `crm_file_read`, `crm_file_insert`, and `crm_file_delete`; each scopes to that bucket through `app_file_allowed(name)`.
- The Auth Hooks page shows the Postgres function `public.app_tenant_access_token_hook` as **Enabled**. Metadata signature: `event jsonb -> jsonb`, `SECURITY DEFINER`, `search_path=""`.

Relations observed:

`app_audit`, `app_byodb_operations`, `app_companies`, `app_company_database_settings`, `app_connector_commands`, `app_connector_enrollments`, `app_connector_mappings`, `app_connector_records`, `app_connector_requests`, `app_connectors`, `app_costs`, `app_demo_requests`, `app_email_outbox`, `app_handovers`, `app_imports`, `app_integrations`, `app_invites`, `app_invoices`, `app_job_budgets`, `app_leads`, `app_members`, `app_notes`, `app_quotes`, `app_rate_limits`, `app_reminders`, `app_requests`, `app_tasks`, `app_time_entries`.

## Differences that block acceptance

- The staged notes/files contract expects `app_lead_notes` and `app_lead_files`; neither relation exists in this inventory. Staging has `app_notes`, which is a different contract. Do not enable note/file UI or apply the proposal until the schema is reconciled and reviewed.
- The public-intake migration expects `app_public_intake_events` and `app_submit_public_lead(...)`; neither appears in this inventory. A different function exists: `public.app_public_lead(s text, data jsonb, request_id uuid) -> uuid`. The rate-limit migration must not be applied to this schema without a reviewed reconciliation.
- Supabase migration history contains these 13 applied versions:

| Version | Name |
|---|---|
| 20260917155629 | stavbacore_initial_schema |
| 20260917160151 | stavbacore_performance_hardening |
| 20260917165504 | stavbacore_business_suite |
| 20260917165549 | stavbacore_business_indexes |
| 20260917170137 | stavbacore_commercial_controls |
| 20260918062031 | forms_integrations |
| 20260918105000 | sales_workflow |
| 20260918111721 | sales_suite |
| 20260918115811 | platform_portal |
| 20260919075823 | pilot_requests |
| 20260919075832 | outbox_reliability |
| 20260919075840 | worker_access |
| 20260919080259 | job_budgets |

The repo's 13 `supabase/migrations/*.sql` files use a different set of version IDs, from `20260911000000` through `20261027000000`. Therefore repository migration history and staging migration history do not match. This does not prove that every staging object is absent—the relation/function inventory shows that staging also has objects outside that applied-version list—but it prevents treating the repository migration chain as the staging database's history.

## Snapshot status

The checked-in `supabase/schema-snapshots/stavbacore-staging-20261027.json` predates this observation and lacks both migration-history and Storage sections. The detailed SQL result was read directly in the dashboard and summarized here; this Markdown is not a substitute for the full machine-readable metadata snapshot. The CI drift gate intentionally fails until a complete, reviewed read-only snapshot is checked in and the migration-history mismatch is resolved.

### 09:29 UTC relation inventory recheck

A second read-only query confirmed the same 28 `public.app_*` relations and 289 columns. It also confirmed 54 `app_*` policies, 53 relevant public/app_private functions, one private `crm-files` bucket with three `storage.objects` policies, and the same 13 staging migration versions listed above. The refreshed relation list still contains `app_notes` only; neither `app_lead_notes` nor `app_lead_files` exists. This confirms the checked-in 2026-10-27 snapshot is incomplete and stale, but does not replace the missing full machine-readable capture of grants, columns, policy definitions, function signatures and Storage metadata.

### Exact inventory delta against the checked-in snapshot

The read-only relation query returned the column names and table definitions. Compared with `stavbacore-staging-20261027.json`, the 20 existing relations have the same 202 column names; staging has eight additional relations (87 columns total):

| Relation | Current columns absent from the older snapshot |
|---|---|
| `app_byodb_operations` | `id`, `company_id`, `connector_id`, `actor_user_id`, `actor_email`, `actor_role`, `idempotency_key`, `mapping_version`, `entity_type`, `action`, `external_id`, `expected_source_version`, `payload`, `status`, `source_version`, `error_code`, `attempts`, `lease_expires_at`, `created_at`, `updated_at` |
| `app_company_database_settings` | `company_id`, `mode`, `driver`, `connector_id`, `write_enabled`, `updated_by`, `updated_at` |
| `app_connector_commands` | `id`, `company_id`, `connector_id`, `command_type`, `mapping_version`, `created_at`, `expires_at`, `acknowledged_at` |
| `app_connector_enrollments` | `id`, `company_id`, `code_hash`, `secret_fingerprint`, `secret_ciphertext`, `scopes`, `created_by`, `created_at`, `expires_at`, `consumed_at` |
| `app_connector_mappings` | `connector_id`, `company_id`, `version`, `definition`, `dry_run_at`, `dry_run_total`, `dry_run_valid`, `dry_run_failed`, `dry_run_issues`, `approved_at`, `approved_by`, `created_at` |
| `app_connector_records` | `id`, `company_id`, `connector_id`, `mapping_version`, `entity_type`, `external_id`, `fingerprint`, `payload`, `source_updated_at`, `archived_at`, `created_at`, `updated_at` |
| `app_connector_requests` | `connector_id`, `request_id`, `expires_at`, `response`, `created_at` |
| `app_connectors` | `id`, `company_id`, `secret_ciphertext`, `scopes`, `status`, `version`, `last_heartbeat_at`, `next_sync_at`, `source_schema`, `last_run`, `pause_reason`, `created_at`, `revoked_at` |

The current 54-policy inventory contains the 36 policy names in the older snapshot plus these 18 tenant-boundary policies: `app_audit.app_jwt_tenant_boundary`, `app_companies.app_jwt_tenant_boundary`, `app_costs.app_jwt_tenant_boundary`, `app_email_outbox.app_jwt_tenant_boundary`, `app_handovers.app_jwt_tenant_boundary`, `app_imports.app_jwt_tenant_boundary`, `app_integrations.app_jwt_tenant_boundary`, `app_invites.app_jwt_tenant_boundary`, `app_invoices.app_jwt_tenant_boundary`, `app_job_budgets.app_jwt_tenant_boundary`, `app_leads.app_jwt_tenant_boundary`, `app_members.app_jwt_tenant_boundary`, `app_notes.app_jwt_tenant_boundary`, `app_quotes.app_jwt_tenant_boundary`, `app_reminders.app_jwt_tenant_boundary`, `app_requests.app_jwt_tenant_boundary`, `app_tasks.app_jwt_tenant_boundary`, and `app_time_entries.app_jwt_tenant_boundary`.

The current 53-function inventory includes 21 function names absent from the older snapshot: `app_ack_byodb_operation`, `app_ack_connector_command`, `app_approve_connector_mapping`, `app_block_cloud_company_writes_for_byodb`, `app_block_cloud_lead_writes_for_byodb`, `app_connector_heartbeat`, `app_create_byodb_operation`, `app_create_connector_enrollment`, `app_get_byodb_context`, `app_get_connector_commands`, `app_ingest_connector_batch`, `app_list_byodb_operations`, `app_list_byodb_records`, `app_owner_connector_command`, `app_owner_connector_status`, `app_poll_byodb_operations`, `app_register_connector`, `app_reserve_connector_request`, `app_save_connector_mapping`, `app_set_company_database_mode`, and `app_tenant_access_token_hook`.

### CI drift verifier coverage update

The verifier now derives declared table/column, policy, and function names from every versioned SQL migration and fails if any required object is missing from the machine-readable snapshot. This complements exact migration-history comparison and prevents a snapshot with a copied version list but stale object inventory from passing. The check compares object presence; it does not certify policy expressions, grants, or function signatures, which still require the full metadata snapshot and security review. The current checked-in snapshot remains intentionally rejected because it lacks migration history and current object inventory.
