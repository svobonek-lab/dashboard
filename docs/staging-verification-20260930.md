# StavbaFlow staging verification (2026-09-30)

This record documents the isolated staging setup. It contains no credentials or
customer rows. The production Supabase project was not modified.

## Staging target

- Supabase project ref: 'oncmtmrhmjlerbwkrecv'
- Region: EU Central
- Migration chain:
  - 'bootstrap_stavbaflow_staging_contract'
  - 'deny_direct_public_intake_events'
  - 'tighten_staging_table_grants'
- Tables present in public: 'app_companies', 'app_members',
  'app_invites', 'app_leads', 'app_public_intake_events'
- All five tables report RLS enabled and contain zero rows at verification time.

## Authorization evidence

Metadata-only catalog checks confirmed:

- Owner/member policies exist for companies, members and invites.
- Lead insert requires the owner role; lead reads and updates are scoped by
  owner membership or lead assignment.
- Direct access to 'app_public_intake_events' is denied for 'anon' and
  'authenticated'; the intake RPC is the only public path.
- 'app_get_public_company' and 'app_submit_public_lead' are executable by
  'anon' because they are the explicitly public form contract.
- 'app_provision_company' and 'app_import_leads' are service-only.
- 'app_create_invite' is authenticated and checks owner membership.
- 'app_role' and 'app_can_lead' are authenticated helper functions used by
  RLS policies.
- Anonymous and authenticated table grants were revoked and re-added only for
  the minimum authenticated dashboard operations. Public intake events remain
  service-only.

## Advisor status

The remaining Security Advisor warnings are the two intentional public intake
SECURITY DEFINER functions and the three authenticated helper/owner functions
used by RLS and invite authorization. Each function has a fixed
search_path=public, pg_temp; the public functions validate the public key,
active form and idempotency key, while owner/service functions enforce their
role boundary. These warnings require a final security review before a
production write release; they are not evidence that production is ready.

## Vercel

The dashboard project's Preview values for VITE_SUPABASE_URL and
VITE_SUPABASE_ANON_KEY now point to this staging project. Production values
were left unchanged. A new deployment is currently blocked by Vercel's
account-level free daily deployment limit; the last READY deployment remains
available and no production deployment was attempted.
