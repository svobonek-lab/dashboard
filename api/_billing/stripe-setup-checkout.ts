import Stripe from 'stripe';

import {
  authorizeOwner,
  bindStripeCustomer,
  createStripeCheckoutSession,
  createStripeCustomer,
  readBillingConfig,
  validBillingConfig,
  type CheckoutRequest,
  type CheckoutResponse,
  type OwnerBillingIdentity,
} from './stripe-checkout.js';

export const SETUP_FEE_AMOUNT = 490_000;
export const SETUP_FEE_OFFER_VERSION = 'setup-fee-4900-czk-v1';

export interface SetupCheckoutDependencies {
  enabled(): boolean;
  authorizeOwner(request: CheckoutRequest): Promise<OwnerBillingIdentity>;
  createCustomer(input: Stripe.CustomerCreateParams, secretKey: string, idempotencyKey: string): Promise<{ id: string }>;
  bindCustomer(companyId: string, customerId: string): Promise<void>;
  createSession(input: Stripe.Checkout.SessionCreateParams, secretKey: string, idempotencyKey: string): Promise<{ id: string; url: string | null; status?: Stripe.Checkout.Session.Status | null }>;
  config(): ReturnType<typeof readBillingConfig>;
}

class SetupCheckoutError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

function requestId(headers: CheckoutRequest['headers'] = {}): string {
  const value = headers['x-stavbaflow-idempotency-key'];
  const key = String(Array.isArray(value) ? value[0] : value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    throw new SetupCheckoutError('BILLING_REQUEST_ID_INVALID', 400);
  }
  return key;
}

export function createSetupCheckoutInput(owner: OwnerBillingIdentity, customerId: string, publicAppUrl: string): Stripe.Checkout.SessionCreateParams {
  const origin = new URL(publicAppUrl);
  if (origin.protocol !== 'https:' || origin.hostname === 'vercel.app' || origin.hostname.endsWith('.vercel.app')) {
    throw new SetupCheckoutError('BILLING_NOT_CONFIGURED', 503);
  }

  const binding = {
    tenant_id: owner.companyId,
    purchase_type: 'setup_fee',
    offer_version: SETUP_FEE_OFFER_VERSION,
  };

  return {
    mode: 'payment',
    managed_payments: { enabled: false },
    allowed_payment_method_types: ['card'],
    customer: customerId,
    client_reference_id: owner.companyId,
    line_items: [{
      price_data: {
        currency: 'czk',
        unit_amount: SETUP_FEE_AMOUNT,
        product_data: { name: 'StavbaFlow – jednorázové zřízení a aktivace' },
      },
      quantity: 1,
    }],
    metadata: binding,
    payment_intent_data: { metadata: binding },
    success_url: `${origin.origin}/billing/return?status=success&kind=setup`,
    cancel_url: `${origin.origin}/billing/return?status=canceled&kind=setup`,
  };
}

export function createStripeSetupCheckoutHandler(dependencies: SetupCheckoutDependencies) {
  return async function stripeSetupCheckoutHandler(request: CheckoutRequest, response: CheckoutResponse): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      response.status(405).json({ code: 'METHOD_NOT_ALLOWED' });
      return;
    }
    if (!dependencies.enabled()) {
      response.status(503).json({ code: 'SETUP_PAYMENT_DISABLED' });
      return;
    }

    try {
      const config = dependencies.config();
      if (!validBillingConfig(config)) throw new SetupCheckoutError('BILLING_NOT_CONFIGURED', 503);
      const owner = await dependencies.authorizeOwner(request);
      if (owner.subscriptionStatus !== 'not_configured') {
        throw new SetupCheckoutError('BILLING_SETUP_NOT_REQUIRED', 409);
      }
      const operationId = requestId(request.headers);

      let customerId = owner.customerId;
      if (!customerId) {
        const customer = await dependencies.createCustomer({
          email: owner.email,
          metadata: { tenant_id: owner.companyId },
        }, config.secretKey, `customer:${owner.companyId}`);
        customerId = customer.id;
        await dependencies.bindCustomer(owner.companyId, customerId);
      }

      const input = createSetupCheckoutInput(owner, customerId, config.publicAppUrl);
      const session = await dependencies.createSession(input, config.secretKey, `setup-checkout:${SETUP_FEE_OFFER_VERSION}:${owner.companyId}:${operationId}`);
      if (session.status === 'expired') {
        response.status(409).json({ code: 'BILLING_SETUP_SESSION_EXPIRED' });
        return;
      }
      if (session.status === 'complete') {
        response.status(409).json({ code: 'BILLING_SETUP_SESSION_COMPLETE' });
        return;
      }
      if (!session.url) throw new SetupCheckoutError('BILLING_SESSION_FAILED', 502);
      const target = new URL(session.url);
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') {
        throw new SetupCheckoutError('BILLING_SESSION_FAILED', 502);
      }
      response.status(200).json({ url: target.toString() });
    } catch (error) {
      if (error instanceof SetupCheckoutError) {
        response.status(error.status).json({ code: error.code });
        return;
      }
      const upstream = error as { status?: unknown; code?: unknown } | null;
      if (Number.isInteger(upstream?.status) && typeof upstream?.code === 'string') {
        response.status(Number(upstream.status)).json({ code: upstream.code });
        return;
      }
      console.error('Stripe one-time setup Checkout failed.', { reason: error instanceof Error ? error.name : 'Unknown' });
      response.status(502).json({ code: 'BILLING_SESSION_FAILED' });
    }
  };
}

export default createStripeSetupCheckoutHandler({
  enabled: () => process.env.STRIPE_SETUP_PAYMENT_ENABLED === 'true',
  authorizeOwner,
  createCustomer: createStripeCustomer,
  bindCustomer: bindStripeCustomer,
  createSession: createStripeCheckoutSession,
  config: readBillingConfig,
});
