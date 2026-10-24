import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export type CheckoutRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type CheckoutResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): { json(value: unknown): void };
};

export type OwnerBillingIdentity = {
  userId: string;
  companyId: string;
  customerId: string | null;
  plan: string;
  email?: string;
};

export type BillingConfig = {
  secretKey: string;
  returnUrl: string;
  mode: 'test' | 'live';
  prices: Record<'pilot' | 'starter' | 'growth', string>;
};

type StripeCheckoutInput = Stripe.Checkout.SessionCreateParams;

export interface CheckoutDependencies {
  authorizeOwner(request: CheckoutRequest): Promise<OwnerBillingIdentity>;
  createCustomer(input: Stripe.CustomerCreateParams, secretKey: string, idempotencyKey: string): Promise<{ id: string }>;
  bindCustomer(companyId: string, customerId: string): Promise<void>;
  createSession(input: StripeCheckoutInput, secretKey: string, idempotencyKey: string): Promise<{ url: string | null; input?: unknown }>;
  config(): BillingConfig;
}

class BillingHttpError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

function readBearer(headers: CheckoutRequest['headers'] = {}): string {
  const raw = headers.authorization ?? headers.Authorization;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return /^Bearer\s+([^\s]+)$/i.exec(String(value || '').trim())?.[1] || '';
}

function supabaseClients(): { auth: SupabaseClient; service: SupabaseClient } {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) throw new BillingHttpError('BILLING_API_UNAVAILABLE', 503);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return { auth: createClient(url, anonKey, options), service: createClient(url, serviceKey, options) };
}

export async function authorizeOwner(request: CheckoutRequest): Promise<OwnerBillingIdentity> {
  const token = readBearer(request.headers);
  if (!token) throw new BillingHttpError('BILLING_AUTH_REQUIRED', 401);
  const { auth, service } = supabaseClients();
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user) throw new BillingHttpError('BILLING_AUTH_INVALID', 401);

  const { data: memberships, error: membershipError } = await service
    .from('app_members')
    .select('company_id,role')
    .eq('user_id', authData.user.id)
    .eq('active', true)
    .eq('role', 'owner');
  if (membershipError || !Array.isArray(memberships) || memberships.length !== 1) {
    throw new BillingHttpError('BILLING_ACCESS_DENIED', 403);
  }

  const companyId = String(memberships[0].company_id || '');
  const { data: company, error: companyError } = await service
    .from('app_companies')
    .select('id,active,stripe_customer_id,plan')
    .eq('id', companyId)
    .eq('active', true)
    .maybeSingle();
  if (companyError || !company) throw new BillingHttpError('BILLING_ACCESS_DENIED', 403);
  return {
    userId: authData.user.id,
    companyId,
    customerId: typeof company.stripe_customer_id === 'string' ? company.stripe_customer_id : null,
    plan: String(company.plan || 'pilot'),
    email: authData.user.email,
  };
}

export function readBillingConfig(): BillingConfig {
  return {
    secretKey: String(process.env.STRIPE_SECRET_KEY || '').trim(),
    returnUrl: String(process.env.BILLING_RETURN_URL || '').trim(),
    mode: process.env.STRIPE_BILLING_MODE === 'live' ? 'live' : 'test',
    prices: {
      pilot: String(process.env.STRIPE_PRICE_PILOT_ID || process.env.STRIPE_PRICE_ID || '').trim(),
      starter: String(process.env.STRIPE_PRICE_STARTER_ID || '').trim(),
      growth: String(process.env.STRIPE_PRICE_GROWTH_ID || '').trim(),
    },
  };
}

function validConfig(config: BillingConfig): boolean {
  if (!new RegExp(`^(?:sk|rk)_${config.mode}_[A-Za-z0-9]+$`).test(config.secretKey)) return false;
  try {
    return new URL(config.returnUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

async function createCustomer(input: Stripe.CustomerCreateParams, secretKey: string, idempotencyKey: string): Promise<{ id: string }> {
  const stripe = new Stripe(secretKey);
  return stripe.customers.create(input, { idempotencyKey });
}

async function bindCustomer(companyId: string, customerId: string): Promise<void> {
  const { service } = supabaseClients();
  const { error } = await service.rpc('app_bind_stripe_customer', {
    p_company_id: companyId,
    p_stripe_customer_id: customerId,
  });
  if (error) throw new BillingHttpError('BILLING_CUSTOMER_BIND_FAILED', 502);
}

async function createSession(input: StripeCheckoutInput, secretKey: string, idempotencyKey: string): Promise<{ url: string | null }> {
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create(input, { idempotencyKey });
  return { url: session.url };
}

function requestId(headers: CheckoutRequest['headers'] = {}): string {
  const raw = headers['x-stavbaflow-idempotency-key'];
  const value = String(Array.isArray(raw) ? raw[0] : raw || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BillingHttpError('BILLING_REQUEST_ID_INVALID', 400);
  }
  return value;
}

function priceFor(config: BillingConfig, plan: string): string {
  if (!['pilot', 'starter', 'growth'].includes(plan)) throw new BillingHttpError('BILLING_PLAN_UNAVAILABLE', 409);
  const priceId = config.prices[plan as keyof BillingConfig['prices']];
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) throw new BillingHttpError('BILLING_PLAN_UNAVAILABLE', 409);
  return priceId;
}

export function createStripeCheckoutHandler(dependencies: CheckoutDependencies) {
  return async function stripeCheckoutHandler(request: CheckoutRequest, response: CheckoutResponse) {
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      response.status(405).json({ code: 'METHOD_NOT_ALLOWED' });
      return;
    }

    try {
      const config = dependencies.config();
      if (!validConfig(config)) throw new BillingHttpError('BILLING_NOT_CONFIGURED', 503);
      const owner = await dependencies.authorizeOwner(request);
      const operationId = requestId(request.headers);
      const priceId = priceFor(config, owner.plan);
      const baseUrl = new URL(config.returnUrl).origin;
      let customerId = owner.customerId;
      if (!customerId) {
        const customer = await dependencies.createCustomer({
          email: owner.email,
          metadata: { tenant_id: owner.companyId },
        }, config.secretKey, `customer:${owner.companyId}`);
        customerId = customer.id;
        await dependencies.bindCustomer(owner.companyId, customerId);
      }
      const sessionInput: StripeCheckoutInput = {
        mode: 'subscription',
        managed_payments: { enabled: false },
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: owner.companyId,
        metadata: { tenant_id: owner.companyId, plan: owner.plan },
        subscription_data: { metadata: { tenant_id: owner.companyId, plan: owner.plan } },
        success_url: `${baseUrl}/billing/return?status=success`,
        cancel_url: `${baseUrl}/billing/return?status=canceled`,
      };

      const session = await dependencies.createSession(sessionInput, config.secretKey, `checkout:billing-v1:${owner.companyId}:${operationId}`);
      if (!session.url || new URL(session.url).hostname !== 'checkout.stripe.com') {
        throw new BillingHttpError('BILLING_SESSION_FAILED', 502);
      }
      response.status(200).json({ url: session.url });
    } catch (error) {
      if (error instanceof BillingHttpError) {
        response.status(error.status).json({ code: error.code });
        return;
      }
      const safe = error as { status?: number; code?: string };
      if (Number.isInteger(safe?.status) && typeof safe?.code === 'string') {
        response.status(Number(safe.status)).json({ code: safe.code });
        return;
      }
      console.error('Stripe checkout creation failed.', { reason: error instanceof Error ? error.name : 'Unknown' });
      response.status(502).json({ code: 'BILLING_SESSION_FAILED' });
    }
  };
}

export default createStripeCheckoutHandler({ authorizeOwner, createCustomer, bindCustomer, createSession, config: readBillingConfig });
