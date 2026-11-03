# Supabase backup and restore status

**Checked:** 2026-11-03 08:36:29 UTC
**Result:** restore drill blocked by the current Supabase plan; no backup was restored and no project/branch was created.

## Projects and current backup configuration

| Environment | Supabase project | Region | Organization plan | Verified backup setup |
|---|---|---|---|---|
| Production | `StavbaFlow Production` (`oncmtmrhmjlerbwkrecv`) | `eu-central-1` | Free | Supabase Free does not provide automatic database backups or PITR. No manually exported backup artifact, schedule, or retention location was found in the repository or available project metadata. |
| Staging | `StavbaCore Staging` (`xwzweltjvreqhjpbjrxa`) | `eu-central-1` | Free | Same organization and plan, so no automatic database backups or PITR. No manually exported backup artifact, schedule, or retention location was found in the repository or available project metadata. |

Both projects are reported `ACTIVE_HEALTHY`. The Supabase organization metadata reports plan `free`. The read-only branch inventory for staging contained only its `main` entry, whose project ref is the staging project's own ref; it did not expose a separate disposable development/restore branch.

On the current plan, there is **no verified backup retention period**: automatic retention is not available, and manual export retention depends on an operator-managed off-site copy. The repository does not currently identify such a copy or a retention owner. Until a documented export exists, recoverability is unproven for both environments.

Supabase recommends regular CLI exports for Free-plan projects. The standard `supabase db dump` command excludes managed schemas such as `auth` and `storage`; by default it dumps schema only, not table data or custom roles. Storage object bytes are separate from database backup data. A CLI dump therefore must not be described as a complete application recovery without separately planning Auth/Storage recovery and verifying all required content.

## Access and custody

- The connected Supabase account can list the organization and both projects. The available read-only project/org tools did not provide the organization's member roster or per-project role assignments, so this report cannot truthfully name every person with backup or database access.
- Supabase Dashboard organization members with project permissions can administer the corresponding project. A named access review must be completed in **Organization → Team** and each project's access controls before a recovery process is approved.
- No backup artifact or off-site storage ACL was available to inspect. Therefore the current backup custodian, readers, and deletion/retention policy are **not verified**.
- Database connection passwords, Management API tokens, and privileged project keys grant different levels of access. Do not put any of them in this document, issue text, or a backup filename. Any future backup artifact must be encrypted, access-controlled, and stored outside the application repository.

## Restore drill attempt

| Timestamp (UTC) | Check | Result |
|---|---|---|
| 2026-11-03 08:36:29 | Organization plan | `free`; automatic backups, PITR, and Supabase branching are unavailable on this plan. |
| 2026-11-03 08:36:29 | Staging branch inventory | Only the project's `main` entry was returned; no disposable restore branch is available. |
| 2026-11-03 08:36:29 | Backup inventory | No backup-listing tool or manual backup artifact was available in this session. Free-plan automatic backups are not provided. |
| 2026-11-03 08:36:29 | Restore | **Not run.** Supabase documents restore-to-new-project as a paid-plan feature requiring physical backups; creating a project/branch is also unavailable here without plan support and could incur charges. |

The requested restore into a new throwaway Supabase project or branch cannot be performed on the verified plan. Per the goal's stop condition, no workaround restore, paid project, branch, migration, or database write was attempted. `scripts/restore-drill.mjs` is not supplied as a pretend-success wrapper: without a permitted backup source and disposable Supabase target it could not carry out the required operation or prove a restore.

## Resume criteria

Resume the drill only after the operator has a plan/feature that supports a disposable restore target and a real staging backup. Before that:

1. Decide whether to upgrade the Supabase organization or establish an approved off-site logical-backup process. A plan change may incur charges and requires the owner's choice.
2. Record the backup artifact location, encryption, retention, named custodians, and recovery credentials procedure without placing secrets in Git.
3. Provision a disposable target through the approved Supabase workflow and confirm its ref is distinct from both projects.
4. Implement/run the drill against that artifact and target, with explicit production-ref refusal; then verify the restored schema and read-only synthetic company A/B membership/lead fixtures.

## References

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups) — Free-plan export guidance, paid-plan automatic backup retention, backup contents, and Storage-object limitation.
- [Supabase Free-plan backup FAQ](https://supabase.com/kb/faqs/platform/free-plan-backups) — no automatic backups on Free; manual CLI exports are available.
- [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project) — paid plan and physical-backup requirements; restore creates a new project and can incur costs.
- [Supabase CLI `db dump`](https://supabase.com/docs/reference/cli/supabase-db-dump) — default schema/data/role behavior and exclusions for managed schemas.
- [Supabase backup and restore with CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) — manual logical export/import workflow.
