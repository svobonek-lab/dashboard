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

## Remaining release action

Create a Vercel Preview using only this staging project, enable the reviewed flags there, confirm Auth SMTP delivery and run a browser smoke test. This evidence does not authorize a production database migration or production deploy.
