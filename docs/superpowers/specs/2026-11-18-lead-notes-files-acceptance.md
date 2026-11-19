# Lead notes and files acceptance design

## Purpose and scope

Prove that notes and private files work for an owner and the assigned employee in isolated StavbaCore Staging, while a foreign employee and company B cannot see or change them. Keep both Production feature gates off until the exact Production RLS, Storage policies, bucket limits and grants are reviewed read-only and a release is approved. The gates are UI controls, not authorization.

## Current evidence

The current staging project `xwzweltjvreqhjpbjrxa` has RLS-enabled `app_lead_notes` and `app_lead_files`, SELECT/INSERT/DELETE policies for authenticated owners or assigned employees, and a private `lead-files` bucket with a 15 MiB limit and JPG, PNG, WebP, HEIC, PDF MIME list. This metadata proves configuration shape, not end-to-end isolation. Current code deletes metadata without checking whether DELETE affected a row. One failed signed URL rejects the whole file list; `DocumentsTab` then clears notes too. Both document and employee photo screens show delete buttons to every viewer. The existing synthetic staging fixture provides owners A/B and employees A/B, with each employee assigned to the lead in their own company. It does not provide a signed-in employee of company A who is unassigned to lead A. Add that distinct controlled fixture before claiming the same-company foreign-employee check passed. The configured `STAGING_PREVIEW_URL` points to the older `codex/staging-e2e-local-runner` branch, so acceptance requires a new Preview of this exact change.

## Approaches considered

- **Keep the current repository and correct the failure paths (chosen).** Add a small pure authorization helper for delete-button visibility. Keep Postgres RLS and Storage policies as enforcement. Ask PostgREST to return deleted rows and treat zero rows as denial. Resolve each signed URL separately and show an unavailable-preview state while preserving metadata and notes. This is the smallest change that preserves the existing schema and workflows.
- Move all attachment operations into a new server API. This could coordinate cleanup, but would introduce service-role and session authorization code and a new privileged surface for a staging acceptance. It is not needed for the current policies.
- Change Storage-first deletion. This risks a metadata row pointing at a deleted object when the later RLS DELETE affects zero rows. Keep metadata-first deletion and explicitly track/clean up orphan objects after Storage failure.

## Behavior and verification

1. Owner and assigned employee can add a note, PDF and JPEG; test HEIC only in a browser that can decode or safely pass it through. After reload, both can read notes and open each stored file. A failed preview URL for one file leaves the other files and all notes visible, with a per-file unavailable state.
2. A delete control appears for an owner at any time, or for the author employee within 15 minutes. The UI rule mirrors the database policy but does not replace it. At the boundary, the database decides. A zero-row RLS DELETE is an error, never success. File metadata DELETE must succeed for exactly one row before Storage deletion. A Storage failure reports that metadata is gone and an orphan requires operator cleanup.
3. Validate the 15 MiB and MIME limits before signed upload. A failed/aborted upload does not insert metadata and attempts cleanup of its exact path; cleanup failure reports an orphan possibility. Signed-upload URL failure does not attempt upload. Upload success followed by metadata rejection attempts exact-path cleanup. Preview URL failure after persistence reports the file as saved with preview unavailable.
4. Run focused unit/integration tests for all listed failure paths and a browser acceptance script with owner, assigned employee, same-company unassigned employee and company B sessions, including metadata REST and Storage reads/writes. The same-company unassigned employee must have a real Auth session and active company A membership, but no assignment to the acceptance lead. Record synthetic IDs, HTTP statuses and cleanup results, without one-time links or credentials. Do not claim completion from unit tests alone.
5. Query Production metadata only through the approved project-scoped read-only `supabase-ci` connection. If it is unavailable, leave production approval and both flags pending. Review `app_lead_notes`, `app_lead_files`, `storage.objects` policies, bucket config, grants, auth/JWT tenant helper functions and exact deployed app URL before writing a release proposal. No Production changes occur in this task.

## Operator cleanup

For an upload whose Storage cleanup failed or a metadata-first delete whose Storage removal failed, record the exact synthetic `company_id/lead_id/file_id-name` path privately. In staging, compare `storage.objects` in `lead-files` with `app_lead_files` for that exact company and lead; verify there is no metadata row and that the object belongs to this acceptance run. Remove only that path through the Storage API under an authorized owner or approved service operator, then verify the object is absent. Never delete from `storage.objects` with SQL and never perform a broad bucket sweep.

## Boundaries

No customer data, production writes, automatic migrations or production flag changes. Existing staging SQL is an observed contract, not a reason to reapply it. Disable automatic Vercel Git deployment for the acceptance branch before pushing it; deploy a reviewed Preview deliberately. A staging Preview and controlled test identities are prerequisites for live browser acceptance.
