import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const MAX_WEBHOOK_BYTES = 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const config = {
  api: {
    // Stripe signs the exact bytes. Parsed JSON cannot be reconstructed safely.
    bodyParser: false,
  },
};

export type BillingSubscriptionStatus = 'active' | 'past_due' | 'canceled';
export type StripeApplyResult = 'applied' | 'duplicate' | 'stale';

export interface StripeSubscriptionUpdate {
  eventId: string;
  eventType: 'checkout.session.completed' | 'customer.subscription.updated' | 'customer.subscription.deleted';
  eventCreatedAt: string;
  tenantId: string | null;
  customerId: string;
  subscriptionId: string;
  subscriptionStatus: BillingSubscriptionStatus;
  currentPeriodEnd: string | null;
}

interface StripeWebhookDependencies {
  verifyEvent(rawBody: Buffer, signature: string, webhookSecret: string): Stripe.Event;
  applySubscriptionUpdate(update: StripeSubscriptionUpdate): Promise<StripeApplyResult>;
}

interface WebhookRequest {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
}

interface WebhookResponse {
  setHeader?(name: string, value: string): unknown;
  status(code: number): WebhookResponse;
  json(body: unknown): unknown;
}

class WebhookHttpError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
    this.name = 'WebhookHttpError';
  }
}

function headerValue(headers: WebhookRequest['headers'], name: string): string {
  const match = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  return Array.isArray(match) ? String(match[0] || '') : String(match || '');
}

async function readRawBody(request: WebhookRequest): Promise<Buffer> {
  if (Buffer.isBuffer(request.body)) {
    if (request.body.byteLength > MAX_WEBHOOK_BYTES) throw new WebhookHttpError(413, 'STRIPE_WEBHOOK_TOO_LARGE');
    return request.body;
  }
  if (typeof request.body === 'string') {
    const buffer = Buffer.from(request.body, 'utf8');
    if (buffer.byteLength > MAX_WEBHOOK_BYTES) throw new WebhookHttpError(413, 'STRIPE_WEBHOOK_TOO_LARGE');
    return buffer;
  }
  if (request.body instanceof Uint8Array) {
    const buffer = Buffer.from(request.body);
    if (buffer.byteLength > MAX_WEBHOOK_BYTES) throw new WebhookHttpError(413, 'STRIPE_WEBHOOK_TOO_LARGE');
    return buffer;
  }
  if (request.body !== undefined) throw new WebhookHttpError(400, 'STRIPE_RAW_BODY_REQUIRED');
  if (typeof request[Symbol.asyncIterator] !== 'function') throw new WebhookHttpError(400, 'STRIPE_RAW_BODY_REQUIRED');

  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request as Required<Pick<WebhookRequest, typeof Symbol.asyncIterator>>) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    length += buffer.byteLength;
    if (length > MAX_WEBHOOK_BYTES) throw new WebhookHttpError(413, 'STRIPE_WEBHOOK_TOO_LARGE');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function verifyStripeEvent(rawBody: Buffer, signature: string, webhookSecret: string): Stripe.Event {
  return Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

function expandableId(value: string | { id: string } | null | undefined): string {
  if (typeof value === 'string') return value;
  return value && typeof value.id === 'string' ? value.id : '';
}

function unixTimestamp(value: number | null | undefined): string | null {
  return Number.isSafeInteger(value) && Number(value) > 0 ? new Date(Number(value) * 1000).toISOString() : null;
}

function tenantIdFrom(metadata: Stripe.Metadata | null | undefined, fallback?: string | null): string | null {
  const candidate = String(metadata?.tenant_id || fallback || '').trim();
  if (!candidate) return null;
  if (!UUID.test(candidate)) throw new Error('Signed Stripe event contains an invalid tenant_id.');
  return candidate;
}

function checkoutTenantId(session: Stripe.Checkout.Session): string | null {
  const metadataTenant = tenantIdFrom(session.metadata);
  const referenceTenant = tenantIdFrom(undefined, session.client_reference_id);
  if (metadataTenant && referenceTenant && metadataTenant !== referenceTenant) {
    throw new Error('Signed Stripe checkout contains conflicting tenant bindings.');
  }
  return metadataTenant || referenceTenant;
}

function mapSubscriptionStatus(status: Stripe.Subscription.Status): BillingSubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'canceled') return 'canceled';
  return 'past_due';
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string | null {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => Number.isSafeInteger(value) && value > 0);
  return periodEnds.length > 0 ? unixTimestamp(Math.max(...periodEnds)) : null;
}

function toSubscriptionUpdate(event: Stripe.Event): StripeSubscriptionUpdate | null {
  const eventCreatedAt = unixTimestamp(event.created);
  if (!eventCreatedAt) throw new Error('Signed Stripe event has an invalid created timestamp.');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') return null;
      const tenantId = checkoutTenantId(session);
      const customerId = expandableId(session.customer);
      const subscriptionId = expandableId(session.subscription);
      if (!tenantId || !customerId || !subscriptionId) throw new Error('Subscription checkout is missing its tenant, customer or subscription binding.');
      return {
        eventId: event.id,
        eventType: event.type,
        eventCreatedAt,
        tenantId,
        customerId,
        subscriptionId,
        subscriptionStatus: session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
          ? 'active'
          : 'past_due',
        currentPeriodEnd: null,
      };
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = expandableId(subscription.customer);
      if (!customerId || !subscription.id) throw new Error('Subscription event is missing its customer or subscription binding.');
      return {
        eventId: event.id,
        eventType: event.type,
        eventCreatedAt,
        tenantId: tenantIdFrom(subscription.metadata),
        customerId,
        subscriptionId: subscription.id,
        subscriptionStatus: event.type === 'customer.subscription.deleted' ? 'canceled' : mapSubscriptionStatus(subscription.status),
        currentPeriodEnd: subscriptionPeriodEnd(subscription),
      };
    }
    default:
      return null;
  }
}

async function persistSubscriptionUpdate(update: StripeSubscriptionUpdate): Promise<StripeApplyResult> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Stripe billing persistence is not configured.');

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await service.rpc('app_apply_stripe_subscription_event', {
    p_event_id: update.eventId,
    p_event_type: update.eventType,
    p_event_created_at: update.eventCreatedAt,
    p_tenant_id: update.tenantId,
    p_stripe_customer_id: update.customerId,
    p_stripe_subscription_id: update.subscriptionId,
    p_subscription_status: update.subscriptionStatus,
    p_current_period_end: update.currentPeriodEnd,
  });
  if (error) throw new Error('Stripe subscription update was rejected by the database.');
  if (data !== 'applied' && data !== 'duplicate' && data !== 'stale') {
    throw new Error('Stripe subscription update returned an invalid result.');
  }
  return data;
}

export function createStripeWebhookHandler(dependencies: StripeWebhookDependencies) {
  return async function stripeWebhookHandler(request: WebhookRequest, response: WebhookResponse) {
    if (request.method !== 'POST') {
      response.setHeader?.('Allow', 'POST');
      response.status(405).json({ received: false, code: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      console.error('Stripe webhook is missing STRIPE_WEBHOOK_SECRET.');
      response.status(500).json({ received: false, code: 'STRIPE_WEBHOOK_NOT_CONFIGURED' });
      return;
    }

    const signature = headerValue(request.headers, 'stripe-signature');
    if (!signature) {
      response.status(400).json({ received: false, code: 'STRIPE_SIGNATURE_INVALID' });
      return;
    }

    let event: Stripe.Event;
    try {
      const rawBody = await readRawBody(request);
      event = dependencies.verifyEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      if (error instanceof WebhookHttpError) {
        response.status(error.status).json({ received: false, code: error.code });
        return;
      }
      response.status(400).json({ received: false, code: 'STRIPE_SIGNATURE_INVALID' });
      return;
    }

    try {
      const update = toSubscriptionUpdate(event);
      if (!update) {
        response.status(200).json({ received: true, result: 'ignored' });
        return;
      }
      const result = await dependencies.applySubscriptionUpdate(update);
      response.status(200).json({ received: true, result });
    } catch (error) {
      console.error('Stripe webhook processing failed.', {
        eventId: event.id,
        eventType: event.type,
        reason: error instanceof Error ? error.name : 'UnknownError',
      });
      response.status(500).json({ received: false, code: 'STRIPE_WEBHOOK_PROCESSING_FAILED' });
    }
  };
}

export default createStripeWebhookHandler({
  verifyEvent: verifyStripeEvent,
  applySubscriptionUpdate: persistSubscriptionUpdate,
});
