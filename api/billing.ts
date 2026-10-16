import stripeCheckoutHandler from './_billing/stripe-checkout.js';
import stripePortalHandler from './_billing/stripe-portal.js';
import stripeWebhookHandler from './_billing/stripe-webhook.js';

export const config = {
  api: {
    // The shared function must preserve Stripe's signed webhook bytes.
    bodyParser: false,
  },
};

type BillingRequest = {
  query?: Record<string, string | string[] | undefined>;
  url?: string;
};

type BillingResponse = {
  setHeader(name: string, value: string): unknown;
  status(code: number): { json(value: unknown): unknown };
};

function routeFrom(request: BillingRequest): string {
  const raw = request.query?.route;
  if (Array.isArray(raw)) return raw[0] || '';
  if (typeof raw === 'string') return raw;
  return new URL(request.url || '/', 'https://stavbaflow.invalid').searchParams.get('route') || '';
}

export default async function billingHandler(request: BillingRequest, response: BillingResponse) {
  const route = routeFrom(request);
  if (route === 'checkout') {
    await stripeCheckoutHandler(request as never, response as never);
    return;
  }
  if (route === 'webhook') {
    await stripeWebhookHandler(request as never, response as never);
    return;
  }
  if (route === 'portal') {
    await stripePortalHandler(request as never, response as never);
    return;
  }
  response.status(404).json({ code: 'BILLING_ROUTE_NOT_FOUND' });
}
