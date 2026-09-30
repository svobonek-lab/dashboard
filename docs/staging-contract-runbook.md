# Staging contract runbook

`supabase/staging/20260930_app_contract.sql` is a review artifact for a disposable
staging Supabase project. It is **not a production migration** and must never be
run against the customer project. The application remains fail-closed until the
contract is verified with metadata-only evidence.

## What the proposal covers

- RLS is enabled for `app_companies`, `app_members`, `app_invites`, and
  `app_leads`.
- Owners can provision a company, manage members and create employee invites.
- Owners and assigned employees can read leads; only owners can create leads.
- Lead updates include both `USING` and `WITH CHECK` tenant checks.
- Public branding is exposed through `app_get_public_company` using a slug or
  UUID and returns only safe display fields.
- Public intake uses `app_submit_public_lead` with an idempotency key and a
  per-company event table.
- CSV import is service-only. The browser endpoint supports a dry-run preview;
  the staging worker records provenance, is idempotent by fingerprint and source
  record, and exposes rollback only to service_role.

## Required staging verification

Apply the proposal only in a disposable staging project after comparing the
actual columns and helper function signatures. Capture catalog output for:

1. `pg_policies` for every `app_*` table, including both command and role.
2. `information_schema.role_table_grants` for `anon`, `authenticated`, and
   `service_role`.
3. `pg_proc` identity arguments, `prosecdef`, and `proconfig` for each RPC.
4. A Security Advisor result showing no unintended `SECURITY DEFINER` grants.

Run the staging smoke path with synthetic tenants only: provision two companies,
invite one employee, submit one public lead per tenant, and prove that the owner
and employee queries cannot cross the company boundary. Repeat the same import
file twice and verify the second run is a no-op, then roll it back through the
service-only worker. Do not use customer rows or production credentials in this
check.

## Current release boundary

The repository intentionally does not enable import writes by default.
api/import-leads requires APP_IMPORT_WORKER_ENABLED=true, a valid Supabase
session, active owner membership and a server-side service key. The flag must
remain disabled in production until the staging evidence above is attached to a
reviewed release.
