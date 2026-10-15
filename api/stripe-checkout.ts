import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

type CheckoutRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type CheckoutResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): { json(value: unknown): void };
};

type OwnerBillingIdentity = {
  userId: string;
  companyId: string;
  customerId: string | null;
  email?: string;
};

type BillingConfig = { secretKey: string; priceId: string; returnUrl: string };

type StripeCheckoutInput = Stripe.Checkout.SessionCreateParams;

export interface CheckoutDependencies {
  authorizeOwner(request: CheckoutRequest): Promise<OwnerBillingIdentity>;
  createSession(input: StripeCheckoutInput, secretKey: string): Promise<{ url: string | null; input?: unknown }>;
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

async function authorizeOwner(request: CheckoutRequest): Promise<OwnerBillingIdentity> {
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
    .select('id,active,stripe_customer_id')
    .eq('id', companyId)
    .eq('active', true)
    .maybeSingle();
  if (companyError || !company) throw new BillingHttpError('BILLING_ACCESS_DENIED', 403);
  return {
    userId: authData.user.id,
    companyId,
    customerId: typeof company.stripe_customer_id === 'string' ? company.stripe_customer_id : null,
    email: authData.user.email,
  };
}

function readConfig(): BillingConfig {
  return {
    secretKey: String(process.env.STRIPE_SECRET_KEY || '').trim(),
    priceId: String(process.env.STRIPE_PRICE_ID || '').trim(),
    returnUrl: String(process.env.BILLING_RETURN_URL || '').trim(),
  };
}

function validConfig(config: BillingConfig): boolean {
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(config.secretKey)) return false;
  if (!/^price_[A-Za-z0-9]+$/.test(config.priceId)) return false;
  try {
    return new URL(config.returnUrl).protocol === 'https:';
  } catch {
    return false;
  }
}

async function createSession(input: StripeCheckoutInput, secretKey: string): Promise<{ url: string | null }> {
  const stripe = new Stripe(secretKey);
  const session = await stripe.checkout.sessions.create(input);
  return { url: session.url };
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
      const baseUrl = new URL(config.returnUrl).origin;
      const sessionInput: StripeCheckoutInput = {
        mode: 'subscription',
        line_items: [{ price: config.priceId, quantity: 1 }],
        client_reference_id: owner.companyId,
        metadata: { tenant_id: owner.companyId },
        subscription_data: { metadata: { tenant_id: owner.companyId } },
        success_url: `${baseUrl}/settings?billing=success`,
        cancel_url: `${baseUrl}/settings?billing=canceled`,
      };
      if (owner.customerId) sessionInput.customer = owner.customerId;
      else if (owner.email) sessionInput.customer_email = owner.email;

      const session = await dependencies.createSession(sessionInput, config.secretKey);
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

export default createStripeCheckoutHandler({ authorizeOwner, createSession, config: readConfig });
