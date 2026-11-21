# Lead notes and private files: staging acceptance

## Scope and current state

The acceptance target is isolated StavbaCore Staging `xwzweltjvreqhjpbjrxa`, on the exact reviewed Preview of `codex/lead-notes-files-acceptance`. Production `VITE_LEAD_NOTES_FILES_ENABLED` and `VITE_PRODUCTION_LEAD_NOTES_FILES_APPROVED` remain off. The repository's browser flags only control visibility; Postgres RLS and private Storage policies decide access.

Read-only staging metadata inspection on 2026-11-18 found RLS enabled on `app_lead_notes`, `app_lead_files`, `storage.objects` and `storage.buckets`. The private `lead-files` bucket permits JPEG, PNG, WebP, HEIC and PDF up to 15,728,640 bytes. `authenticated` has SELECT, INSERT and DELETE grants on both metadata tables. Policies scope notes, files and Storage objects to owner or assigned employee; employee DELETE additionally requires authorship and the 15-minute window. These catalog facts do not prove the browser flow.

The same-company unassigned probe uses one staging-only fixture: lead `e5f4eab8-291b-4ba8-913f-20a036d6a709` in synthetic company A `3a51a21e-5b13-48d1-87e9-a5915b46d37d`. Its title is `StavbaFlow E2E Unassigned Attachment Lead` and `assigned_to` is null. It was inserted through the isolated staging database on 2026-11-19 because `authenticated` has no `INSERT` or `DELETE` grant on `app_leads`; a stale staging service-role secret returned HTTP 401. GitHub variable `STAGING_UNASSIGNED_LEAD_ID` contains only this public synthetic UUID. The test checks title, company and assignment before writing any note or file, and removes its own notes and files. After acceptance, delete this exact lead through the staging operator and remove the GitHub variable, then verify no attachment metadata or Storage objects remain under its path. Never use the shared Preview server runtime to seed this fixture.

The synthetic company A currently has `subscription_status=canceled` from billing acceptance, so `SubscriptionGuard` correctly hides its workspace. For each attachment browser run, record that original status, set only company A to `active` in isolated staging with a conditional update, and restore `canceled` immediately after the run, even when the run fails. This temporary change and restoration were verified for runs `44553798565` and `44554933932`. Do not change Stripe or another company's entitlement for this test.

Run `44554933932` verified owner and assigned employee notes, PDF and JPEG, reload, private signed reads, metadata authors and company B isolation. Its cleanup assertion used an authenticated object GET immediately after a successful Storage DELETE. The GET returned a cached 200 while the Storage catalog already showed that object absent. The test now checks object existence through the Storage `info` endpoint, which is distinct from cached file delivery. Three files from synthetic run `00c49be4` were removed by staging cleanup run `44902468698`; read-only catalog checks confirmed zero notes, metadata and Storage objects for that run.

The exact-commit Preview `dpl_H9NGkb7VqCNna6B4tZ8gquox7PxH` for `e880550` passed all three Playwright scenarios in run `44902944937` on 2026-11-21. This includes the 15,728,640-byte private Storage upload/read, 15,728,641-byte and unsupported MIME rejection, owner and employee notes/PDF/JPEG after reload, signed reads, company B and unassigned employee denial, failed preview and interrupted upload, partial delete failure and authorized deletes. The synthetic company's original `canceled` status was restored, and read-only staging checks found no recent synthetic attachment rows or objects after cleanup.

## Exact Preview procedure

1. Review the PR diff and verify `vercel.json` disables automatic Git deployment for this branch.
2. On the exact branch, manually dispatch `staging-e2e.yml` with `runner_mode=lead-attachments-configure`. It creates only missing branch-scoped Preview environment values using GitHub Actions secrets without printing them. Confirm the run succeeds and inspect variable **names and branch scope only**. Do not copy values into a report.
3. Deliberately create a Vercel Preview for the reviewed commit. Record its deployment ID, commit SHA and HTTPS URL. Confirm its built client targets staging using `scripts/assert-staging-e2e-env.mjs` before any browser writes.
4. Manually dispatch `staging-e2e.yml` on that branch with `runner_mode=lead-attachments-acceptance` and `lead_attachments_preview_url` set to that exact Preview URL. The provenance check requires the deployment metadata to match the workflow commit SHA, branch and Vercel project. The preflight then rejects a Production Supabase target. Record the run URL, result and synthetic fixture IDs.
5. If a check fails, inspect the trace and repair the code or fixture. Repeat against a new exact Preview SHA; do not treat an older Preview or a green unit suite as acceptance.
6. To remove residue from a known synthetic run, dispatch `runner_mode=lead-attachments-cleanup` with `lead_attachments_cleanup_run_id` set to its exact eight-character lowercase hex ID. This authenticates as the staging owner, restricts paths to company A and lead A, removes only matching Storage objects through the Storage API, then deletes their metadata and matching synthetic notes. Confirm both catalogs are empty for that run. Never use this mode for customer data or a different staging lead.

## Required evidence matrix

| Scenario | Evidence needed |
| --- | --- |
| Owner and assigned employee add notes, PDF and JPEG (HEIC only in a browser that decodes it), then reload and open | Browser trace, HTTP 200 for each private signed read, exact synthetic metadata rows and authors |
| Owner delete at any age; employee delete only own within 15 minutes | UI controls plus affected-row REST responses, including an expired synthetic record after 15 minutes |
| Same-company unassigned employee and company B | Zero visible metadata rows, rejected or zero-row writes, denied private Storage reads/writes and surviving owner control |
| 15 MiB and MIME | Exact 15,728,640-byte allowed upload, 15,728,641-byte rejection, unsupported MIME rejection, no rejected metadata |
| Interrupted upload and signed URL failure | No metadata after interrupted upload; exact-path cleanup checked; one failed preview leaves notes and other files visible |
| Zero-row RLS DELETE and Storage delete failure | No success on zero-row delete; partial failure message after Storage delete error; orphan identified and cleaned |

The live run verifies the exact-boundary Storage upload. A fourth Playwright scenario now creates a synthetic employee-owned note and PDF, waits 16 minutes, then checks that the employee cannot delete either by UI or RLS and that the owner can delete both. Retain the old-age release gate until this longer scenario passes on an exact Preview.

## Exact-path orphan cleanup

If an upload cleanup or metadata-first delete reports a possible orphan, ask the operator for the displayed file UUID and the synthetic company/lead IDs from the acceptance run. In isolated staging, inspect only that company and lead. Use a read-only query scoped to the exact path or UUID:

```sql
select o.name, f.id as metadata_id
from storage.objects o
left join public.app_lead_files f
  on f.storage_path = o.name and f.company_id = :company_id and f.lead_id = :lead_id
where o.bucket_id = 'lead-files'
  and o.name like :company_id || '/' || :lead_id || '/' || :file_id || '-%';
```

Verify the object was created by this synthetic acceptance run and `metadata_id` is null. Remove only its exact `name` through the Storage API as the authorized owner or approved staging operator, then verify the object is absent. Never delete from `storage.objects` using SQL and never sweep a whole bucket. Keep exact paths, credentials and signed URLs out of public logs and PR comments.

## Production gate

Review current Production table policies, `storage.objects` policies, bucket limits, grants, tenant helper functions and exact deployed app URL only via the approved project-scoped read-only `supabase-ci` MCP. That connection is unavailable in this session, so the review is pending. No Production flag proposal or change is authorized until staging acceptance passes and a separate release decision is approved.
