# Combined tenant release acceptance (2026-10-24)

Prepared review units:
- PR #97: durable outbox/acknowledgement/checkpoint, bounded transport retries and patched connector dependencies.
- PR #98: JWT tenant boundary, live membership checks, immutable creator and Storage boundary.
- PR #99: verified test-mode signup/Checkout, atomic paid provisioning and activation-return UI.

Local integration branch verify/tenant-release-combined combines the reviewed source branches. The workflow append conflict was resolved by retaining BOTH the JWT and paid-provisioning jobs. This integration branch is verification only; main was not merged or pushed.

Combined evidence: 293 application tests, 62 runnable connector tests and TypeScript pass. Six external database integration tests are skipped. The local PostgreSQL/PGlite acceptance applies the Stripe, JWT and paid-provisioning SQL together; prepare/bind/paid webhook creates an active workspace, the Auth hook emits its company claim, and the new owner can insert only their own first job. A wrong-company claim yields no company/job rows.

To repeat combined SQL on disposable PostgreSQL 17 after both proposal files are available:
1. supabase/tests/stripe_billing_setup.sql
2. supabase/staging/20261015_stripe_billing_contract.sql
3. supabase/tests/paid_provisioning_setup.sql
4. supabase/tests/paid_jwt_setup.sql
5. supabase/staging/20261024_jwt_tenant_boundary.sql
6. supabase/staging/20261024_paid_tenant_provisioning.sql
7. supabase/tests/paid_jwt_verify.sql

These fixtures CREATE mock schemas/roles and are NEVER staging/production migrations.

Remaining approval gates: manually review/apply proposal SQL on isolated staging; configure Auth hook and redirect URLs; enable both paid-registration flags only there; browser E2E including verified email, synthetic Stripe test payment, duplicate webhook, employee access and cross-company denial; actual MSSQL/MySQL/PostgreSQL integration acceptance. No production release, live payment or customer source database operation was performed.
