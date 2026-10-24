# Tenant isolation, durable connector and paid onboarding

1. Tenant RLS: new staging-only proposal over app_* tables. JWT app_metadata.tenant_id must equal row company_id, AND live app_role membership must authorize the action. Never trust user_metadata for tenant/role. Restrictive tenant policies must coexist with narrower assignment policies, not widen them. Auth hook/backfill and refresh are explicit release dependencies; absent claim fails closed.
2. Connector: persist envelope + source cursor in the same atomic file. Send pending batches before reading new source pages. Commit cursor only after accepted cloud acknowledgement, before removing pending file. Crash between these steps replays the same request ID. Preserve compatibility with pre-existing pending envelopes. Recover local write chain after a rejected write. Verify outage, crash and retry paths.
3. Paid onboarding: service-only checkout registration intent binds existing verified Auth UUID, plan, legal agreements and Stripe customer/session. Successful signed/paid checkout provisions app_companies, app_members and defaults in one transaction. Duplicate events reuse intent; conflict fails closed. Existing tenant checkout remains supported. No caller-supplied owner or tenant claim from browser may trigger provisioning.
4. Disposable SQL tests for two tenants, malformed/missing claims, role revocation, employee ownership, provisioning rollback/replay. No automatic migrations or production writes. Prepare reviewable SQL and PRs; runtime/browser release remains separate.

Current evidence: app_* is authoritative code contract; historical atomic_tenant_provisioning.sql uses legacy organizations/users and must not be reused. Live metadata unavailable while browser access is disabled.
## Connector verification checkpoint

The outbox recovery changes pass 13 targeted state/sync tests. Complete connector suite: 59 pass, 6 database integration tests skipped without external databases. Root suite: 284 pass; TypeScript and Vite build pass. No live cloud/customer source access was used.

Implemented: envelope and cursor persisted together; accepted batch checkpoint committed before pending removal; restart reuses request ID; rejected atomic writes no longer poison later writes; each API request has a 30-second abort deadline. Existing HTTP retry remains exponential (250/500 ms) with durable pending data retained after retries fail. Cloud business upsert remains idempotent by existing source identity contract.

Remaining: live connector database/image acceptance, SQL JWT policy/hook tests, and paid registration intent/provisioning transaction. The RLS proposal is not applied and must not be enabled before trusted claim issuance/refresh is tested.
