# Prompt 3 Exact Preview Acceptance Plan

**Goal:** Run authenticated acceptance against the exact `main` source SHA `1afc95b93fc4e25adfa4ccfb9389a5d953f738a3` on an isolated staging Preview, using only local self-hosted GitHub runners.

**Constraints:** Never write to production Supabase. Never launch GitHub-hosted jobs. Keep secrets in GitHub Actions secrets and runner environment; do not print or commit values. Only the staging Preview alias may be reassigned. Restore all exact synthetic fixtures after testing.

1. Verify the one-shot Linux runner can execute a workflow. Record the metadata-only probe result, including failures.
2. On `codex/staging-e2e-local-runner`, make `preview-redeploy` check out the exact SHA and deploy with explicit staging build/runtime Supabase variables and Sentry DSN. Assert the target project refs before deployment. Keep the dedicated Preview alias.
3. Make `local-ephemeral` check out the same SHA. Run the built-in preflight, authenticated Playwright suite and the exact synthetic CSV rollback cleanup.
4. Start a fresh ephemeral self-hosted runner for each workflow dispatch. Inspect each run's job allocation and logs, then verify deployment SHA, bundled staging target and effective UI flags.
5. Prepare active synthetic fixtures and staging admin without touching production. Extend coverage for lead detail, assignment, attachments, CSV retry, admin at 390/1280 px and Sentry alert history where the existing suite is insufficient.
6. Deliver exactly one new synthetic Sentry event, inspect its tags in Sentry and confirm a corresponding alert trigger. Record all failures and skips in the acceptance report.
