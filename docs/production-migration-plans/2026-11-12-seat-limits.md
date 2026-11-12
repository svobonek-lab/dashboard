# Production migration plan: employee seat limits

**Status: proposal only. No production SQL has been applied or approved.** Source: `supabase/migrations/20261101144114_employee_seat_limits.sql`. It proposes two partial indexes, `app_private.enforce_employee_seat_limit()`, triggers on `app_invites` and `app_members`, and a replacement `app_private.accept_invite(uuid)`.

## Known mismatch and preflight

The approved November 8 snapshot did not find the proposed seat function, indexes or triggers. Obtain a fresh production metadata inventory of `app_companies.plan`, invite/member columns and keys, all existing triggers and indexes, the complete `app_private.accept_invite(uuid)` signature/security/grants, and the public wrapper or other callers. Capture the exact pre-change invite function and ACLs securely outside the repo. Check the active employee and pending employee-invite counts **as aggregates only** under approved read-only access; a company already over a proposed cap needs an explicit grandfathering decision before enabling write-path enforcement. Do not infer isolation from RLS flags.

The source limits Pilot/Starter to five active or reserved employee seats, Growth to 15 and Pro to unlimited. A company row lock serializes additions. Reconcile the live invite activation implementation and lock order before producing candidate SQL. Test direct member/invite writes, activation, resends, expiry, concurrent additions and two-company isolation in disposable PostgreSQL and isolated staging. The source CI job `employee-seat-limit-contract` exercises synthetic fixtures, not the live production baseline.

## Verification query

Run only through approved read-only `supabase-ci` before and after any separately approved change. Review trigger definition, enabled state, index predicates, function signature/security and ACL as a set.

```sql
select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
       pg_catalog.pg_get_triggerdef(t.oid) as definition, t.tgenabled as enabled
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('app_invites', 'app_members')
  and not t.tgisinternal
order by 2, 3;

select n.nspname as schema_name, c.relname as table_name, i.relname as index_name,
       pg_catalog.pg_get_indexdef(i.oid) as definition
from pg_catalog.pg_index x
join pg_catalog.pg_class c on c.oid = x.indrelid
join pg_catalog.pg_class i on i.oid = x.indexrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('app_invites', 'app_members')
order by 2, 3;

select n.nspname, p.proname,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.proacl as execute_acl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private'
  and p.proname in ('enforce_employee_seat_limit', 'accept_invite')
order by 1, 2, 3;
```

The post-change synthetic staging check must prove an over-cap invite/member insert is rejected, a valid activation exchanges one reserved seat for one active seat, a rejected activation leaves the invite pending, concurrent additions cannot exceed the cap, and company B cannot consume company A's seats.

## Rollback

First stop new invite creation/activation through the application. In a separately reviewed transaction, remove **only** the newly added seat triggers, restore the captured `app_private.accept_invite(uuid)` body and original grants, then remove the new enforcement function and indexes after dependency checks. Preserve existing invitations, memberships and audit rows. Previously accepted invitations cannot safely be made pending again; reconcile any in-flight attempt before traffic resumes. Verify triggers/functions/indexes and ACLs with the catalog queries above, then test the restored invitation flow with synthetic staging users.

## Approval gate

Approval requires fresh production objects and aggregate over-cap evidence, a reviewed live-schema reconciliation SQL/hash, exact captured rollback definitions, disposable and isolated-staging A/B/concurrency results, and a written decision for each production write. This plan authorizes none.
