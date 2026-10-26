# Incident response runbook

Use this runbook for a suspected production or staging incident involving Supabase, scheduled email, Stripe, or a customer integration. Keep the initial response read-only. Do not paste customer records, credentials, API keys, authorization headers, webhook payloads, or raw email content into tickets or chat.

## 1. Record and classify

1. Record the affected environment, deployment URL, approximate UTC start time, first observed symptom, and a request or deployment identifier if available.
2. Mark the report as staging or production. Do not use a production session to reproduce a staging issue.
3. Preserve the relevant Vercel deployment and function logs before changing configuration. Redact email addresses, tokens, and customer content from any excerpt.
4. Escalate suspected credential exposure or cross-company access immediately to the service owner. Treat access-boundary failures as high severity and stop the affected write path.

## 2. Supabase and tenant access

1. Check the Supabase project health and API status, then compare with the Vercel deployment's environment and project reference. Never display or copy secret values into the incident record.
2. Check recent migration/deployment history and the safe application error code. Use only metadata or aggregate checks unless an approved, tenant-scoped support procedure requires more.
3. For suspected RLS or tenant isolation failure, stop the affected feature or deployment, preserve audit evidence, and reproduce with synthetic accounts in isolated staging. Do not probe another company's rows.
4. Do not apply, roll back, or hand-edit RLS SQL during triage. Prepare a reviewed migration and a separate staging rollout approval first.

## 3. Email outbox and scheduler

1. Check the Vercel Cron/function invocation status and confirm `CRON_SECRET`, sender configuration, and provider availability by presence/status only. Never reveal their values.
2. Read the latest aggregate `app_email_outbox_runs` records only through controlled server-side operator access. The application has no browser reader for this service-only table. Rows contain status, timestamps, counts, and a bounded error code; they do not contain recipients, subject lines, bodies, or provider message IDs. A row left in `running` means the worker did not write a final result; it does not prove whether any messages were sent, so reconcile the outbox delivery states before any retry.
3. Interpret `success`, `partial`, and `failed` together with `selected_count`, `delivered_count`, `retry_count`, `failed_count`, and `skipped_count`. The worker retries failed deliveries with the existing delay and provider idempotency key. Do not manually resend a message until its delivery state and idempotency are understood.
4. The worker writes a `running` marker before it reads or sends email. If the evidence table is missing or unavailable, it stops before processing any email. Verify that the reviewed `20261027_outbox_run_evidence.sql` contract has been applied to that environment before enabling the scheduler.

## 4. Stripe billing

1. Identify the deployment environment and confirm that staging uses Stripe test mode. Do not replay a live event in test or staging.
2. Compare the Stripe event ID and safe application error code with the webhook/function logs. Do not copy payloads, customer email, payment data, or signing secrets.
3. Check the durable billing intent/payment state before retrying. Use Stripe's event and idempotency behavior; do not create a replacement checkout or manually mark an invoice paid to clear an incident.
4. Escalate any mismatch between Stripe's payment state and StavbaFlow's recorded state to the service owner before issuing refunds, credits, or another charge.

## 5. Database connector or customer NAS

Pause the affected connector from the approved owner workflow if its source mapping, tenant identity, or delivery integrity is in doubt. Preserve the connector digest and run summary. Do not request a customer's database password or run writes against their SQL server. Reproduce using a synthetic source and a SELECT-only account.

## 6. Recovery and closure

1. Write down the confirmed scope, containment action, recovery evidence, and any unresolved uncertainty.
2. Verify recovery in staging with synthetic data first, then follow the separately approved production release process.
3. Keep secrets out of the report; rotate exposed credentials using the provider's supported process and update only the authorized environment.
4. Close the incident only after the owner confirms service recovery and required follow-up work has an issue or pull request. Do not claim customer impact is absent unless the available evidence supports that conclusion.
