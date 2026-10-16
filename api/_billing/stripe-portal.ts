import Stripe from 'stripe';

import {
  authorizeOwner,
  readBillingConfig,
  type CheckoutRequest,
  type CheckoutResponse,
  type OwnerBillingIdentity,
} from './stripe-checkout.js';

type PortalConfig = { secretKey: string; returnUrl: string; mode: 'test' | 'live' };

export interface PortalDependencies {
  authorizeOwner(request: CheckoutRequest): Promise<OwnerBillingIdentity>;
  createPortalSession(input: Stripe.BillingPortal.SessionCreateParams, secretKey: string): Promise<{ url: string }>;
  config(): PortalConfig;
}

class PortalHttpError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

function validConfig(config: PortalConfig): boolean {
  if (!new RegExp(`^(?:sk|rk)_${config.mode}_[A-Za-z0-9]+$`).test(config.secretKey)) return false;
  try {
    return new URL(config.returnUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

async function createPortalSession(input: Stripe.BillingPortal.SessionCreateParams, secretKey: string) {
  return new Stripe(secretKey).billingPortal.sessions.create(input);
}

export function createStripePortalHandler(dependencies: PortalDependencies) {
  return async function stripePortalHandler(request: CheckoutRequest, response: CheckoutResponse) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      response.status(405).json({ code: 'METHOD_NOT_ALLOWED' });
      return;
    }
    try {
      const config = dependencies.config();
      if (!validConfig(config)) throw new PortalHttpError('BILLING_NOT_CONFIGURED', 503);
      const owner = await dependencies.authorizeOwner(request);
      if (!owner.customerId) throw new PortalHttpError('BILLING_CUSTOMER_MISSING', 409);
      const returnUrl = new URL('/settings?billing=portal_return', new URL(config.returnUrl).origin).toString();
      const session = await dependencies.createPortalSession({ customer: owner.customerId, return_url: returnUrl }, config.secretKey);
      const target = new URL(session.url);
      if (target.protocol !== 'https:' || target.hostname !== 'billing.stripe.com') {
        throw new PortalHttpError('BILLING_PORTAL_FAILED', 502);
      }
      response.status(200).json({ url: target.toString() });
    } catch (error) {
      if (error instanceof PortalHttpError) {
        response.status(error.status).json({ code: error.code });
        return;
      }
      const safe = error as { status?: number; code?: string };
      if (Number.isInteger(safe?.status) && typeof safe?.code === 'string') {
        response.status(Number(safe.status)).json({ code: safe.code });
        return;
      }
      console.error('Stripe billing portal creation failed.', { reason: error instanceof Error ? error.name : 'Unknown' });
      response.status(502).json({ code: 'BILLING_PORTAL_FAILED' });
    }
  };
}

export default createStripePortalHandler({
  authorizeOwner,
  createPortalSession,
  config: () => {
    const config = readBillingConfig();
    return { secretKey: config.secretKey, returnUrl: config.returnUrl, mode: config.mode };
  },
});
