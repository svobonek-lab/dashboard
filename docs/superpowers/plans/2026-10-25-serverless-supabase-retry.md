# Serverless Supabase HTTP Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make serverless Supabase HTTP requests resilient to transient read failures without misconfiguring HTTPS API clients as PostgreSQL wire-protocol connections.

**Architecture:** Keep `supabase-js` pointed at the configured HTTPS Supabase URL. Add a shared serverless client factory whose fetch wrapper retries only safe `GET`/`HEAD` requests for transient network failures and selected retryable HTTP statuses, using bounded exponential backoff. No raw PostgreSQL client currently exists in `api/`, and `docker-compose.synology.yml` runs the customer connector and MariaDB rather than a self-hosted Supabase stack.

**Tech Stack:** TypeScript, `@supabase/supabase-js`, Node built-in test runner (`tsx --test`).

**Spec:** User-approved corrected approach in this conversation; objective attachment `C:\Users\svobo\.codex\attachments\1147dfbf-8c98-4f93-9a90-7c8f09ba370c\goal-objective.md`.

## Global Constraints

- Preserve `SUPABASE_URL` and `VITE_SUPABASE_URL` as HTTPS Supabase API URLs; do not add an unused database URL.
- Retry at most two times after the initial request, only for `GET` and `HEAD`.
- Never retry writes or Auth mutations because a lost response can hide a completed operation.
- Keep production Supabase strictly read-only; make no production or staging calls or configuration changes.
- Do not add Supavisor to `docker-compose.synology.yml`; it is not a self-hosted Supabase stack.
- For any future direct PostgreSQL client used by serverless code, document transaction-mode port `6543`, a per-instance pool limit of `1`, SSL, and transaction-mode feature limits.

## Review Focus

- A request with an unsafe method (`POST`, `PATCH`, `DELETE`) must never be repeated, even after a transient response; test a POST returning 503.
- A caller abort must not be retried; test `AbortError` propagation.
- A permanent HTTP response must pass through unchanged; test a non-retryable 400 response.
- A transient network failure on GET must recover within the bounded attempt count; test network failure followed by success and final failure after three attempts.
- `HEAD` must be treated as safe and reuse the same backoff policy; test retry on a transient status.

---

### Task 1: Add a bounded retrying fetch wrapper

**Files:**
- Create: `api/_shared/retryingFetch.ts`
- Test: `tests/serverless-supabase-fetch.test.ts`

**Interfaces:**
- Produces: `createRetryingFetch(fetchImpl: typeof fetch, options?: RetryOptions): typeof fetch`.
- Retry `GET`/`HEAD` for network `TypeError` failures except aborts, and statuses `408`, `425`, `429`, `500`, `502`, `503`, and `504`.
- Use three maximum attempts, exponential delay starting at 100 ms capped at 1000 ms, and permit injected sleep/random sources for deterministic tests.

- [x] **Step 1: Write failing tests** for transient GET network recovery, 503 recovery, HEAD retry, bounded exhaustion, POST no-retry, 400 pass-through, and abort no-retry.
- [x] **Step 2: Run** `npx tsx --test tests/serverless-supabase-fetch.test.ts`; confirm the new module is missing.
- [x] **Step 3: Implement** `createRetryingFetch` with safe-method gating, bounded exponential backoff, and transient error/status classification.
- [x] **Step 4: Run** `npx tsx --test tests/serverless-supabase-fetch.test.ts`; all retry cases pass without real delays.

### Task 2: Route serverless Supabase clients through the shared factory

**Files:**
- Create: `api/_shared/supabaseClient.ts`
- Modify: every `createClient(...)` call in `api/**/*.ts` to use `createServerlessSupabaseClient(...)`, preserving existing auth, headers, and client behavior.
- Test: extend `tests/serverless-supabase-fetch.test.ts` to verify custom global headers/options survive factory configuration and its requests use the retrying fetch.

**Interfaces:**
- Consumes: `createRetryingFetch` from Task 1.
- Produces: `createServerlessSupabaseClient(url: string, key: string, options?: SupabaseClientOptions<'public'>): SupabaseClient`.

- [x] **Step 1: Add a failing factory test** for option preservation and retry behavior.
- [x] **Step 2: Run** `npx tsx --test tests/serverless-supabase-fetch.test.ts`; confirm the factory is missing.
- [x] **Step 3: Implement** the factory and replace all serverless `api/` call sites, preserving per-route auth and service-role separation.
- [x] **Step 4: Run** the focused test and `npm run lint`; both pass.

### Task 3: Document the actual connection boundary

**Files:**
- Create: `docs/serverless-database-pooling.md`
- Modify: `.env.example`
- Do not modify: `docker-compose.synology.yml` (inspection confirmed it contains no Supabase or Supavisor service).

- [x] **Step 1: Clarify** that `SUPABASE_URL` is the HTTPS API URL consumed by `supabase-js`, while port `6543` applies only to a raw PostgreSQL transaction-mode DSN.
- [x] **Step 2: Document** the conditional raw PostgreSQL serverless settings (`6543`, per-instance pool `1`, SSL, and transaction-mode limitations), self-hosted Supavisor tenant/secrets, and default pool size `20` without adding Supavisor to the unrelated connector Compose file.
- [x] **Step 3: Review** the example and guide to confirm they add no unused secret or database URL.

### Task 4: Verify the integrated change

**Files:** none.

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run `git diff --check` and review the full diff for credential leakage and accidental Compose changes.
- [ ] Open a PR from `codex/serverless-supabase-retry`; do not merge it.
