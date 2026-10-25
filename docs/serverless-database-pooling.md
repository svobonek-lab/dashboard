# Serverless Supabase and PostgreSQL connections

## StavbaFlow serverless APIs

The serverless routes under `api/` use `@supabase/supabase-js` with the project's HTTPS URL. The SDK talks to Supabase Auth and the PostgREST API over HTTPS; it does not open a PostgreSQL TCP connection. Keep `SUPABASE_URL` set to the HTTPS project API URL. A PostgreSQL URI or port `6543` is not valid in this setting.

The Supabase serverless driver guide describes this `supabase-js` API as using HTTPS and a built-in connection pooler. A raw PostgreSQL client is not currently used in `api/`. These HTTP clients use a shared fetch wrapper that retries only `GET` and `HEAD` on transient network errors and retryable HTTP statuses. Writes and Auth mutations are never automatically retried because a failed response can hide a completed operation.

## Synology connector

`docker-compose.synology.yml` describes the StavbaFlow connector, an optional MariaDB instance, and Caddy. It is not a self-hosted Supabase stack and has no Supavisor service. The long-running Synology connector's PostgreSQL adapter creates a `pg.Pool` capped at three connections and marks its source transactions read-only. It connects to the configured source database, not StavbaFlow's Supabase database from a Vercel function. Do not set the MariaDB connector's port to `6543` or add Supavisor variables to this Compose file.

## If a serverless raw PostgreSQL client is added later

Use the transaction-mode connection URI shown by the Supabase Dashboard's **Connect** dialog. For a shared Supavisor pooler, its username includes the project reference:

```text
postgres://postgres.[PROJECT_REF]:[PASSWORD]@[POOLER_HOST]:6543/postgres
```

Configure one client-side connection per warm serverless instance, require SSL, and disable prepared statements where the driver supports them. Transaction mode releases the database connection after each transaction, so session state such as `SET`, `LISTEN/NOTIFY`, session advisory locks, or temporary tables spanning transactions cannot be relied on. Keep migrations and other long-lived administrative work on a separately reviewed connection path.

## If Supabase is self-hosted

Use the official Supabase self-hosted Compose stack and its documented `.env` configuration. Supavisor's default `POOLER_DEFAULT_POOL_SIZE` is `20`; size it below `max_connections` after reserving capacity for PostgreSQL and other Supabase services. The connection username follows `postgres.[POOLER_TENANT_ID]` and transaction mode uses port `6543`.

The self-hosted stack also requires generated `SECRET_KEY_BASE` and `VAULT_ENC_KEY` values. Keep them in a secrets manager or private deployment environment; never commit their values. These settings do not belong in the current Synology connector Compose file.

References: [Supabase serverless drivers](https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers), [Supabase self-hosted PostgreSQL access](https://supabase.com/docs/guides/self-hosting/accessing-postgres), and [self-hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker).
