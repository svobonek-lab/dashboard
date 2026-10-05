# StavbaFlow platform administrator runbook

This runbook is for the isolated staging project only. It never authorizes a production write.

## Prerequisites

1. Review `supabase/staging/20261005_platform_admin_contract.sql` and compare it with staging metadata.
2. Apply that contract manually through the approved staging change process.
3. Confirm RLS is enabled on all three platform tables, browser table grants are absent, function search paths are fixed, and only the self-role lookup is executable by `authenticated`.
4. Rotate the staging service-role key and set it only in the operator environment as `STAGING_SUPABASE_SERVICE_ROLE_KEY`.
5. Set `STAGING_SUPABASE_URL=https://oncmtmrhmjlerbwkrecv.supabase.co`.
6. Confirm the target email already belongs to exactly one verified Supabase Auth user.

## Dry run

```text
npm run provision:platform-admin -- --email operator@example.invalid
```

The command resolves the existing Auth UUID and prints a masked plan. It does not create a user, change a password, or grant access during the dry run.

## Apply in staging

After reviewing the masked UUID-level plan:

```text
npm run provision:platform-admin -- --email operator@example.invalid --apply
```

The command stores only the Auth UUID in the platform registry and writes an audit event. If the audit event fails, the new platform access is disabled and the command fails.

## Required evidence

- unified login routes the active platform operator to `/admin`;
- owner and employee sessions receive `403` from both platform API routes;
- the platform operator receives the minimal company directory without contacts or business rows;
- the operator cannot query tenant leads through browser credentials;
- deactivating the registry row removes platform access on the next check;
- the sales deployment opens the configured dashboard `/demo` URL;
- browser console, network responses, and built assets contain no service-role value.

Production assignment requires a separate metadata review, change request, and explicit approval. Never copy the staging registry row or run this command with a production URL.
