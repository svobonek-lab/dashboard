# Pilot implementation ledger — 2026-09-30
Branch: fix/pilot-operational-flow. Base: origin/main 0c8cf43 (PR #60).
Goal is the complete two-company pilot. The code, isolated staging contract and deployed Preview flow are verified; Auth has now accepted and logged a real-mail invitation, while recipient-link completion remains pending.

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
- Vercel Preview passed browser checks for owner/employee routing, manual lead persistence, employee lifecycle write, owner B isolation and anonymous public intake.
- The deployed CSV API completed an import, returned an idempotent duplicate on retry and completed service-only rollback.
- Runtime ESM paths and post-auth tenant refresh were repaired from failures reproduced only in Vercel/browser verification.
- The live Preview invitation endpoint accepted the authorized real mailbox; staging Auth logged `user_invited`, HTTP 200 and `mail.send` for the invitation.
- A separate synthetic browser activation consumed an invitation, created an employee membership, routed to `/employee`, enforced assigned-only visibility, persisted the employee status transition across logout/login and rejected a direct price change with SQLSTATE `42501`.
- Synthetic activation rows and Auth user were removed; the real invitation remains pending for the recipient.

## Remaining required work (do not mark complete)
1. Open the delivered real-mail invitation and verify the exact email-link redirect, final account confirmation and member activation. Auth accepted and logged the send; inbox receipt and link completion are still pending.
2. Review outbox concurrency before enabling optional business notifications; missing transport already fails closed.
3. Obtain a reviewed production release decision. No production schema migration, data write or deploy is included in this branch.

## Checks
- Initial 63 tests green; the final branch verification passes 86/86 tests, TypeScript and the production build.
- Advisor now has only two intentional anonymous SECURITY DEFINER warnings for public branding/intake. Internal membership helpers are no longer exposed through the public API schema.
- No production reads/writes executed in this implementation.
- No secrets added and no direct commit to `main`; PR #61 was merged after its required checks passed.
- SQL fixtures use reserved synthetic identifiers and rollback. Final query confirmed zero fixture companies and leads.
- Ruling: Supabase staging schema edits authorized by user plan; no production release implied.
- Ruling: Do not implement full Sheets/SQL integrations; selected pilot scope is CSV, unsupported integrations fail honestly.
