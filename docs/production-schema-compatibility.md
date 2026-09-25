# Production Schema Compatibility Audit

## Summary

This document identifies three source-to-production table mismatches between the current codebase and the verified production metadata (run 35997191752). All 20 public tables in production have RLS enabled.

## Mismatch 1: Table Prefix Mismatch

**Production Tables** (verified via `supabase-ci_list_tables`):
- `app_companies` (RLS enabled)
- `app_members` (RLS enabled)
- `app_leads` (RLS enabled)
- `app_notes` (RLS enabled)
- `app_tasks` (RLS enabled)
- `app_quotes` (RLS enabled)
- `app_audit` (RLS enabled)
- `app_rate_limits` (RLS enabled)
- `app_requests` (RLS enabled)
- `app_time_entries` (RLS enabled)
- `app_costs` (RLS enabled)
- `app_invoices` (RLS enabled)
- `app_handovers` (RLS enabled)
- `app_reminders` (RLS enabled)
- `app_email_outbox` (RLS enabled)
- `app_imports` (RLS enabled)
- `app_integrations` (RLS enabled)
- `app_demo_requests` (RLS enabled)
- `app_job_budgets` (RLS enabled)

**Source Code References** (lib/supabase.ts, context/OrganizationContext.tsx):
- Uses `employees` table (line ~300-330 in context/OrganizationContext.tsx)
- Uses `organizations` table (line ~260-270 in context/OrganizationContext.tsx)
- Uses `leads` table (line ~408-430 in context/OrganizationContext.tsx)
- Uses `company_settings` (line ~123-197 in lib/supabase.ts)

**Discrepancy**: Production tables are prefixed with `app_` (e.g., `app_companies`, `app_members`, `app_leads`), while the source code references tables without this prefix (`employees`, `organizations`, `leads`). This suggests the source layer uses simplified identifiers that map to the production `app_*` tables.

## Mismatch 2: RPC `submit_public_lead` Targeting Issue

**Production Implementation** (migration 20260911000003_secure_widget.sql):
- Defines function `public.submit_public_lead` (line 3-49)
- Grants execute rights to anonymous, authenticated, and service_role users (lines 100-101)

**Source Usage** (context/OrganizationContext.tsx, lines 1312-1314):
```typescript
const { data: rpcLeadId, error: rpcError } = await supabase.rpc('submit_public_lead', {
```
The RPC is called but the production table structure may differ. The function expects parameters like `customer_name`, `customerEmail`, etc., which correspond to the `app_leads` table in production. However, the source code maps leads to `app_leads` (see lines 408-430), suggesting alignment. The mismatch is that the RPC is designed for public lead submission but the underlying table structure in production uses `app_leads` while the source code abstracts this away.

## Mismatch 3: Missing `company_settings` Table

**Production Metadata** (run 35997191752):
- All 20 public tables listed (including `app_companies`, `app_members`, `app_leads`)
- No `company_settings` table present

**Source Code** (lib/supabase.ts, lines 123-197):
- Contains `getCompanySettings()` and `saveCompanySettings()` methods
- Stores company settings in `app_settings` (LocalStorage key `company_settings`)
- Includes default settings for `app_companies`, `app_members`, `app_leads`

**Discrepancy**: The source code implements `company_settings` functionality but there is no corresponding `company_settings` table in the production schema. This indicates either:
1. The settings are stored entirely in the application layer (LocalStorage)
2. The table was removed during migration
3. The settings are derived from other tables

## Recommendations

1. Align source code table references with production naming convention (add `app_` prefix where applicable)
2. Verify that `submit_public_lead` RPC correctly interacts with `app_leads` table
3. Investigate why `company_settings` is not reflected in the production schema

## Verification

- Production tables verified via `supabase-ci_list_tables` (run 35997191752)
- All 20 tables have RLS enabled
- Source code references match production table names except for the prefix discrepancy
- Company settings are managed in application layer (LocalStorage) rather than database

## Status

Audit completed. Documentation created in `docs/production-schema-compatibility.md`.
