# Pilot import runbook

## Current supported path

The first customer pilot uses a CSV/API import in dry-run mode. The import preview parses the file locally, suggests field mappings, calculates a stable company-scoped fingerprint, and shows validation results. It does not write to StavbaFlow or to the customer's database.

The direct SQL connector is deliberately unavailable until a reviewed server-side read-only connector exists. The API and local helper now return an explicit unavailable result with zero tables and zero rows instead of synthetic construction records.

## Customer flow

1. The owner exports a read-only CSV/API view from the current company database.
2. The owner selects the file in the onboarding import step.
3. StavbaFlow detects the delimiter, shows headers and a limited local preview, and suggests mappings.
4. The owner confirms mappings and sees validation errors, duplicate candidates, and the company-scoped idempotency fingerprint.
5. A reviewed staging job performs the import into `app_leads`; the browser never receives a database password and the first pilot never writes back to the source database.
6. The result records source filename, fingerprint, mapping version, counts, skipped duplicates, and errors in an audit event.

## Verified staging contract

- `app_imports` records company, source file, row count, summary and tenant-scoped fingerprint.
- The API authenticates an active owner and the database RPC is service-only.
- Repeating the same company/fingerprint is idempotent; source record ids prevent duplicates.
- Rollback removes only untouched newly imported rows and refuses an unsafe rollback after edits.
- The browser does not upload database credentials and direct SQL remains unavailable.

The Preview release must still run one disposable API commit and rollback with the deployment service key before the import button is enabled for a pilot customer.
