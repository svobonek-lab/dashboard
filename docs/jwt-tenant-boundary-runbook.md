# JWT tenant boundary release notes

This staging-only proposal adds RESTRICTIVE RLS boundaries to existing app_* business tables. The row's company_id (the app schema tenant key) must equal auth.jwt().app_metadata.tenant_id and a current active membership must exist. A forged browser row ID, stale membership or user_metadata claim cannot bypass that boundary. Existing assignment and operational-field guards remain required.

The optional app_projects/app_tasks/app_quotes tables are protected only if present; this script does not create unsupported business features. Leads represent pilot jobs in the current schema. Existing service-only public intake/connector/platform RPCs require separate actor-bound checks because service_role bypasses RLS.

Owner access remains tenant-scoped. Employees may delete only their own assigned lead. created_by is set by an INSERT trigger and immutable on UPDATE; historical unknown creators remain owner-only. Notes/files retain stricter creator+15-minute policies. The proposal does not grant DELETE table permissions that the existing release intentionally withheld.

## Manual staging sequence

1. Review actual app_* schema, existing policies and function signatures.
2. Apply 20261024_jwt_tenant_boundary.sql only to isolated staging.
3. Configure the Supabase Custom Access Token Hook to public.app_tenant_access_token_hook. Only supabase_auth_admin can execute it.
4. Refresh test sessions. Until refreshed, missing tenant claims deny business access.
5. Test owner A/B, assigned/unassigned employee, revoked membership, owner/employee mutations, private Storage and invitation activation. Platform admin has no tenant claim or tenant access.
6. If users have multiple active memberships, this initial hook deliberately issues no tenant claim. A separately reviewed company-selection contract is required.
7. Record policy/grant metadata and the exact deployment/session results before production review. No automatic migration/deployment.

The SQL fixture verifies cross-company SELECT/INSERT/UPDATE/DELETE, row company change, invalid/missing-trusted claim, creator spoof, employee deletion, revocation and hook grants. It was executed with local PGlite (embedded PostgreSQL), not against Supabase. CI repeats it on disposable PostgreSQL 17. Auth hook delivery, session refresh and full application integration remain staging release gates.
