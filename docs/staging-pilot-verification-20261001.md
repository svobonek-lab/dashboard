# Staging pilot verification — 2026-10-01

Project: isolated Supabase staging `oncmtmrhmjlerbwkrecv`. Production was not queried or changed.

## Real Auth and REST result

Three temporary confirmed Auth users represented owner A, employee A and owner B. Two temporary companies and their leads were inserted. The executable `scripts/staging-pilot-e2e.mjs` check then verified through the public Supabase client:

- owner A reads only company A and owner B reads only company B;
- employee A reads only leads assigned to that employee;
- owner A creates a lead and changes its status;
- employee A advances the assigned lead and cannot change its price;
- owner B cannot read or mutate the new company A lead;
- insert/update history is present;
- the lead and assignment persist after sign-out and a new sign-in.

Result: all assertions passed. Temporary leads, events, members, companies and Auth users were deleted. Final counts for those staging tables and Auth users were zero.

## Transactional database checks

The following rollback-only SQL checks passed:

- `pilot_authorization.sql`: tenant isolation, owner invitation permission, employee field restrictions and lifecycle;
- `pilot_invitation.sql`: verified matching email, expiry, one-time acceptance and membership activation;
- `pilot_invitation_resend.sql`: replacement invitation expires the earlier unused invitation;
- `pilot_import_rollback.sql`: history persistence and refusal to remove edited imported leads;
- `pilot_public_intake.sql`: tenant slug resolution, exact idempotent retry and lead provenance.

## Vercel Preview and browser result — 2026-10-02

The branch Preview was configured with staging-only write flags and a branch-specific staging service-role key. No production environment variable was changed. The following full interactions passed in a real browser and through the deployed API functions:

- owner A signed in and was routed directly to the owner dashboard;
- a manual lead was persisted, returned after a clean sign-in and contained no fabricated employee assignment;
- employee A was routed to the employee workspace and saw only the single assigned company A lead;
- employee A advanced the persisted lifecycle from `New` to `Contacted`; the database revision and audit event both increased and the state survived reload;
- owner B saw only the company B lead in the Kanban;
- the anonymous public widget resolved company A by slug, submitted a lead and stored `source=public_form`, the intake request key and the selected value;
- the deployed CSV worker completed one import, returned the same import on retry with `duplicate=true`, and the service-only rollback deleted the untouched imported lead;
- GitHub Actions, both Vercel Preview checks and the browser deployment were green after the runtime module-resolution repair.

The executable direct REST check was repeated after the browser run and again passed tenant isolation, employee field restrictions, audit history and logout/reload persistence. Cleanup then removed every synthetic company, member, lead, event, invitation, import, intake event and Auth user; final counts were zero.

## Live invitation and activation evidence — 2026-10-02

The owner invitation endpoint was called through Vercel's authorized Preview channel with the user's explicitly authorized mailbox. The deployed endpoint returned `invited: true`; the staging Auth audit log recorded `user_invited`, the Auth request completed with HTTP 200, and the mail log recorded `mail.send` with type `invite`. The stored invitation is unused, unexpired and waiting for the recipient to open the delivered link.

The activation contract was also exercised independently with a temporary confirmed staging user carrying a synthetic invitation id:

- the first application login invoked `app_accept_invite`, consumed the invitation and created one active employee membership;
- routing landed directly on `/employee` without a role selector;
- the employee saw the assigned lead and did not see an unassigned lead from the same company;
- the employee advanced the assigned lead from `new` to `contacted` in the browser;
- the audit event preserved the actor and old/new status while the lead value remained `12500`;
- a direct employee attempt to change the value was rejected with SQLSTATE `42501`;
- logout followed by a new login restored the assigned lead and persisted `contacted` state.

The temporary activation user, membership, invitation, leads and events were deleted. A final query confirmed zero remaining rows for those synthetic identifiers. The real mailbox invitation and its isolated synthetic owner/company remain only until the recipient completes the link or the invitation is explicitly cleaned up.

## Remaining release action

The recipient must open the real invitation link so receipt and the exact email-link redirect can be observed end to end. Leaked-password protection is unavailable on the current Supabase Free plan; the dashboard identifies it as Pro-only. Security Advisor otherwise reports only the two intentional anonymous public-form functions.

This evidence does not authorize a production database migration, production data write or production deploy.

## Contract recheck after PR #62 merge — 2026-10-02

The current staging database contract was exercised again after the invitation and outbox changes reached `main`. Each check ran inside an explicit transaction and ended with `ROLLBACK`:

- authorization: outsider invitation denied, employee visibility limited to assigned leads, employee price mutation denied, invalid lifecycle jump denied, owner cross-company read and mutation denied;
- invitation: verified matching email required, expired and wrong-email invitations denied, membership created once, accepted invitation cannot be reused;
- public intake: public tenant slug resolved, exact request retry returned the same lead, event retained the lead id, unknown tenant denied;
- import rollback: an edited imported lead was retained and its insert/update history remained present.

All four checks returned their explicit `PASS` result. A separate query after the transactions confirmed zero rows for the reserved synthetic company, member, lead, invitation and Auth-user identifiers. The real-mail invitation remains unaccepted and was not modified by these checks.

The same review found that staging Auth still used `http://localhost:3000` as its Site URL and had no redirect allow list. The staging configuration was corrected to the stable dashboard origin and three explicit, previously verified `/login` URLs; no wildcard was added. A full page reload confirmed the saved Site URL and all three entries. The invitation and recovery endpoints now also reject a missing, non-HTTPS or non-origin `APP_URL` before any database or Auth request, instead of constructing a relative `/login` redirect.

After the redirect repair, Supabase Auth sent a new confirmation message to the already authorized real mailbox. The Auth request completed with HTTP 200, used the stable dashboard origin as its referer and emitted `mail.send` with `mail_type=confirmation`. The user's metadata still contains the same staged `invite_id` and `company_id`; the invitation remains unused until the recipient opens the new message.

## Current protected Preview recheck — 2026-10-02

The seven pilot runtime variables were scoped to `fix/pilot-auth-readiness` in the `dashboard` Vercel project. The staging service-role value remained write-only, `APP_URL` was corrected to the stable dashboard HTTPS origin, and the invite, recovery, import, app-schema read and pilot-write switches were limited to that Preview branch. Production variables and deployments were not changed.

Vercel rebuilt the protected Preview as deployment `dpl_AhBU57qd6GUURmq3VzwuRxi4vtRx`. An authenticated owner request reached the deployed `/api/import-leads` function through Vercel's authorized protection bypass. The dry run parsed one row, the first commit created one lead, and the identical retry returned `duplicate: true` with fingerprint `csv_33101fc0`. The reviewed rollback then removed the imported lead; the follow-up count for that fingerprint was zero.

The same deployment received an authenticated attempt by owner A to invite a synthetic address into company B. It returned HTTP 403 before Auth provisioning. A metadata check immediately afterward found zero matching `app_invites` rows and zero matching Auth users. The real-mail invitation was not changed by either check and remains pending recipient confirmation.

## Real mailbox activation — 2026-10-03

The authorized real recipient completed email confirmation and password recovery through the stable public dashboard origin. Staging metadata then proved that the original invitation was consumed, `accepted_at` was recorded, and exactly one active `employee` membership was linked to company A. No email address, token, password or user id is stored in this report.

One clearly labelled synthetic lead was assigned to that membership for the final browser check. A rollback-only database test running under the real authenticated user identity proved that:

- the employee could see exactly that assigned lead;
- a permitted `in_progress` to `won` status change affected one row;
- changing the lead value was rejected by the database authorization trigger;
- a second synthetic company and its lead were neither visible nor mutable;
- the rollback left the assigned lead unchanged and removed the temporary company B fixture.

The stable login page is publicly reachable and waiting for the recipient to sign in. The remaining release observation is the real browser session: automatic `/employee` routing, assigned-lead rendering, persisted status change, logout and a clean second login.
