# StavbaFlow pilot operator runbook

Use this checklist for every pilot company. It separates configuration from evidence and prevents a visually working dashboard from being mistaken for a verified customer workspace.

## 1. Prepare the environment

- Confirm the target is staging or an explicitly approved production release.
- Confirm the application and landing deployments use the intended `VITE_DEPLOYMENT_SURFACE` values.
- Confirm the application URL opens `/login` and does not expose a role selector.
- Confirm browser configuration contains only the Supabase URL and publishable key.
- Confirm the service-role key exists only in server-side Vercel Functions configuration.
- Keep `VITE_PILOT_WRITES=false` unless the exact staging project is being verified.
- Keep the invite worker disabled unless its database and Auth contract has been reviewed for this environment.

Record the deployment URL, Git commit and Supabase project reference. Do not copy secret values into the record.

## 2. Provision a synthetic rehearsal company

- Create company A and its owner through the reviewed tenant provisioning path.
- Create company B and its owner for isolation checks.
- Use synthetic names, addresses, emails and leads.
- Confirm each owner is routed to the owner dashboard without choosing a role.
- Confirm neither owner can select or infer the other company.

Do not continue if the app falls back to demo data, legacy tables or a local successful result.

## 3. Verify employee onboarding

- Owner A sends one employee invitation.
- Confirm the endpoint returns an invitation identifier, never a password or raw activation token.
- Confirm Auth accepted the message and the outbox/provider state does not report delivery prematurely.
- Open the delivered link, set the employee password and confirm automatic routing to `/employee`.
- Confirm the invitation has an acceptance timestamp and cannot be consumed again.
- Confirm an expired invitation fails without creating a membership.
- Confirm password recovery sends a one-time link and owners cannot set employee passwords.

## 4. Verify the job workflow

- Owner A creates one lead with identifiable synthetic values.
- Assign it to employee A and leave a second lead unassigned.
- Employee A must see the assigned lead and must not see the unassigned lead.
- Employee A advances only an allowed lifecycle transition.
- Attempt a direct price or company change as employee A; it must fail.
- Log out and sign in again; the assigned lead and status must persist.
- Confirm the audit history contains the actor and old/new status.

## 5. Verify public intake

- Resolve the company through its public tenant slug, never an internal company UUID.
- Submit one synthetic inquiry and confirm its source and request key.
- Repeat the same request key and confirm no second lead is created.
- Exceed the reviewed rate limit and confirm a controlled error.
- Submit an invalid tenant slug and confirm no customer data is disclosed.

## 6. Verify CSV import

- Upload a synthetic CSV and review the mapping and validation errors before commit.
- Commit the import and record its fingerprint and provenance without storing credentials.
- Repeat the same import and confirm it is reported as a duplicate.
- Roll back the untouched import and confirm its inserted leads are removed.
- Edit one imported lead, retry rollback and confirm the edited record is retained.

Do not claim Google Sheets, SQL or Synology support during the pilot.

## 7. Verify tenant isolation

Test through both the browser and direct authenticated API requests:

- owner A can read and modify only company A;
- owner B can read and modify only company B;
- employee A can read only assigned company A jobs;
- owner B and employee A cannot mutate a company A lead outside their allowed scope;
- guessed company and lead identifiers do not bypass RLS;
- missing access produces an error or no row, never demonstration data.

## 8. Release decision

Before activating a customer, attach evidence for:

- the exact commit and successful CI run;
- the Vercel deployment and browser smoke result;
- invitation, login, logout and recovery;
- public intake idempotency and rate limiting;
- CSV import idempotency and rollback;
- two-company isolation;
- Security Advisor and function-grant review;
- rollback and support ownership.

Production schema changes, production write flags and provider configuration are separate reviewed actions. Completing this checklist does not authorize them automatically.
