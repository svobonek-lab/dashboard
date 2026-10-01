# Pilot implementation ledger — 2026-09-30
Branch: fix/pilot-operational-flow. Base: origin/main 0c8cf43 (PR #60).
Goal is the complete two-company pilot. The code and isolated staging contract are now pilot-ready; deployment flags and mail delivery still require a reviewed Preview release.

## Verified progress
- Reproduced outsider invitation authorization failure with executable SQL regression.
- Applied supabase/staging/pilot_authorization.sql ONLY to staging oncmtmrhmjlerbwkrecv via execute_sql.
- app_create_invite now SECURITY INVOKER, requires authenticated owner, rejects missing membership with SQLSTATE 42501.
- Lead trigger enforces immutable company/id, employee status-only writes and valid transitions; validates same-company active assignment.
- supabase/tests/pilot_authorization.sql passes with rolled-back synthetic fixtures.
- Applied pilot_history_rollback.sql to staging: append-only RLS history; service-only rollback refuses edited imports.
- pilot_import_rollback.sql passed: changed lead retained, both insert/update audit events present.
- Sheets deliberately unavailable in pilot instead of invented records / partial eight-row sync. SQL already unavailable. CSV remains planned sole import.
- Outbox missing provider now 503 before DB access; read errors no longer success. Further delivery/claim/retry review still required.
- App lead writer added behind explicit VITE_PILOT_WRITES plus exact staging project URL; no deployment flag enabled. Production remains blocked.
- Partial saves no longer synthesize defaults and erase unsupplied fields. Quote mapping corrected.
- Invite server now invokes RPC with user JWT rather than service role after privilege repair.
- Invitation request/response contracts now match, acceptance requires a verified matching Auth email, is one-time and expires. Resending invalidates the prior unused invitation.
- Pending invitations appear in the team list without fabricated credentials. Password recovery sends a one-time link; owners never see or set employee passwords.
- CSV parsing preserves multiline quoted values, validates mappings, and binds the reviewed mapping into the idempotency fingerprint. SQL and Sheets remain honestly unavailable.
- Public intake now uses the tenant slug rather than an internal UUID, persists the lead id for exact retry idempotence, and enforces a per-tenant minute rate limit.
- RLS helper functions moved out of the exposed public API schema. Security Advisor now reports only the two intentionally anonymous public-form functions.
- A real Auth + REST staging test passed for two companies: owner isolation, employee assignment scope, owner create/update, employee status-only update, audit history, logout/login persistence and cross-tenant mutation denial. All synthetic rows and Auth users were removed afterward.

## Remaining required work (do not mark complete)
1. Configure a Preview deployment with staging-only keys and enable the reviewed pilot flags; verify Auth SMTP delivery and browser interaction there.
2. Run the service-key API import endpoint in Preview with a disposable CSV; the SQL worker, idempotence and rollback are verified independently.
3. Review outbox concurrency before enabling optional business notifications; missing transport already fails closed.
4. Run final secret scan, full CI, visual smoke test and draft PR review. No production release is included.

## Checks
- Initial 63 tests green; the final branch verification passes 82/82 tests, TypeScript and the production build.
- Advisor now has only two intentional anonymous SECURITY DEFINER warnings for public branding/intake. Internal membership helpers are no longer exposed through the public API schema.
- No production reads/writes executed in this implementation.
- No secrets added, no main commits/merge/push.
- SQL fixtures use reserved synthetic identifiers and rollback. Final query confirmed zero fixture companies and leads.
- Ruling: Supabase staging schema edits authorized by user plan; no production release implied.
- Ruling: Do not implement full Sheets/SQL integrations; selected pilot scope is CSV, unsupported integrations fail honestly.
