# Stripe TEST billing acceptance

**Status: NOT RUN.** No Preview purchase, webhook event, cancellation, period-end transition, or `past_due` screen has been verified. Do not treat local billing contract tests as an end-to-end Stripe acceptance result.

Use only the Vercel Preview deployment and Stripe TEST mode. Before starting, record the Preview URL and deployed commit, and verify the server is configured with Stripe test credentials and a TEST-mode Start price. Do not enter production payment details or record card data, secrets, customer names, or email addresses here. Use a Stripe-provided test payment method.

## Acceptance log

Record UTC timestamps and safe Stripe test event/session IDs as each step is actually completed. Keep unperformed steps marked NOT RUN; do not backfill timestamps.

| Step | Timestamp (UTC) | Result | Safe evidence |
|---|---|---|---|
| Confirm Preview deployment and Stripe TEST mode | NOT RUN | Pending | No current environment-mode evidence recorded |
| Start Start-plan checkout using Stripe test payment method | NOT RUN | Pending | No test checkout session |
| Verify signed checkout webhook sets the correct tenant `subscription_status=active` | NOT RUN | Pending | No webhook event reference |
| Verify owner access after activation | NOT RUN | Pending | No Preview owner session evidence |
| Cancel using the billing portal | NOT RUN | Pending | No cancellation event/reference |
| Verify access remains until period end, then is removed | NOT RUN | Pending | No period-end transition evidence |
| Verify `past_due` displays the intended screen | NOT RUN | Pending | No `past_due` Preview evidence |

## Gate

Acceptance remains open until every row has a UTC timestamp and matching safe evidence. Run only after the Preview deployment is confirmed to use Stripe TEST mode; stop if mode or tenant binding is ambiguous. Never test against production.
