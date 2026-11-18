# Staging Gmail sender for Managed Cloud acceptance

## Intent and boundaries

Deliver two synthetic Managed Cloud owner invitations and two employee invitations without purchasing a domain. The owner authorized use of a personal Gmail account **only for staging**. Keep the existing outbox, audit records, encrypted invitation links, retry budget, and Resend Production path. Never place a Gmail password or app password in Git, logs, PR text, or chat. This design does not authorize a Production email configuration change.

## Approaches

- **Gmail SMTP with a Google app password (chosen):** small server-side adapter behind the existing `EmailProvider` interface. Requires the owner to enable two-step verification and create an app password directly in Google, then enter it directly as a Vercel Preview secret for the exact branch. It has no native provider idempotency; ambiguous sends must not be retried automatically.
- **Gmail API with OAuth:** narrower send-only scope, but requires an OAuth project, consent and token lifecycle. This is disproportionate for two staging messages and still does not supply a native idempotency key.
- **Resend test sender:** currently limited to the Resend account's own address; it cannot prove delivery to two distinct owner aliases. Resend rejected the no-cost ClouDNS public subdomain.

## Proposed behavior

1. The server selects Gmail SMTP only when `VERCEL_ENV=preview`, the exact Preview branch is `codex/staging-gmail-invitations`, and explicit staging provider configuration is complete. All other deployments keep the existing Resend selection and fail closed when its configuration is missing.
2. The Gmail adapter accepts only an exact allowlist of four controlled staging owner and employee addresses (including chosen aliases) configured in Preview env. The worker filters unrelated pending messages before claiming them. It sends from the Gmail account address. It never exposes the app password in responses or audit records.
3. SMTP's accepted message ID is recorded as `provider_message_id`; definite recipient rejection is terminal. Network timeout or acceptance ambiguity is recorded as an unknown delivery state, with **no automatic resend**. An operator may inspect the Gmail Sent folder and outbox row before deciding to retry or compensate. Existing Resend idempotent retries remain unchanged.
4. Configure Gmail user, app password, from address, and recipient allowlist only on the branch-scoped Vercel Preview, directly in Vercel. Before deployment, verify that inherited Resend or Stripe secrets cannot silently select a wrong provider or environment. No credential values are copied through this workspace.
5. Verify unit tests for provider selection, branch restrictions, allowlist, success, definite rejection, timeout ambiguity, stale claim handling, and secret-safe error reporting; run repository checks. Then deploy manually to Preview and confirm provider delivery for the owner and employee invitations through the existing outbox/audit evidence. Keep Production proposal separate.

## Remaining owner action

The owner must choose which controlled Gmail account is allowed to send staging invitations, enable two-step verification if needed, generate an app password in Google, and enter it directly into branch-scoped Vercel Preview settings. The app password must not be sent to the agent. The code and review can be prepared before this credential is available.
