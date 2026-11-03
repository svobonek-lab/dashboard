export const MAX_OUTBOX_ATTEMPTS = 5;
const RETRY_BASE_MS = 60_000;
const RETRY_MAX_MS = 60 * 60_000;
const SAFE_PROVIDER_ERROR_CODES = new Set([
  'EMAIL_PROVIDER_REJECTED',
  'EMAIL_PROVIDER_UNCONFIRMED',
  'EMAIL_PROVIDER_TEMPORARY',
  'EMAIL_PROVIDER_RATE_LIMITED',
]);

export interface OutboxEmail {
  id: string;
  recipient?: string | null;
  to?: string | null;
  subject: string;
  body?: string | null;
  body_html?: string | null;
  attempts: number;
}

export interface EmailProvider {
  send(email: OutboxEmail, idempotencyKey: string): Promise<{ id: string }>;
}

export interface OutboxDeliveryStore {
  markDelivered(id: string, providerMessageId: string, deliveredAt: string): Promise<void>;
  markFailure(update: {
    id: string;
    status: 'retry' | 'failed';
    attempts: number;
    lastError: string;
    scheduledFor?: string;
  }): Promise<void>;
}

export class EmailProviderError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'EmailProviderError';
  }
}

export function retryDelayMs(attempt: number): number {
  const exponent = Math.max(0, Math.min(attempt - 1, 10));
  return Math.min(RETRY_BASE_MS * (2 ** exponent), RETRY_MAX_MS);
}

export function isRecoverableOutboxClaim(status: unknown, updatedAt: string | null | undefined, staleBefore: string): boolean {
  if (status !== 'processing' && status !== 'sending') return false;
  const updatedAtMs = Date.parse(updatedAt || '');
  const staleBeforeMs = Date.parse(staleBefore);
  return Number.isFinite(updatedAtMs) && Number.isFinite(staleBeforeMs) && updatedAtMs <= staleBeforeMs;
}

function normalizeProviderError(error: unknown): EmailProviderError {
  if (error instanceof EmailProviderError && SAFE_PROVIDER_ERROR_CODES.has(error.code)) return error;
  return new EmailProviderError('EMAIL_PROVIDER_TEMPORARY', true);
}

export async function deliverClaimedOutboxEmail(
  email: OutboxEmail,
  dependencies: {
    provider: EmailProvider;
    store: OutboxDeliveryStore;
    now?: () => Date;
  },
): Promise<{ status: 'delivered' | 'retry' | 'failed'; errorCode?: string }> {
  const now = dependencies.now || (() => new Date());
  let providerMessageId: string;
  try {
    const result = await dependencies.provider.send(email, `outbox/${email.id}`);
    if (!result || typeof result.id !== 'string' || result.id.length === 0) {
      throw new EmailProviderError('EMAIL_PROVIDER_UNCONFIRMED', true);
    }
    providerMessageId = result.id;
  } catch (error) {
    const providerError = normalizeProviderError(error);
    const retry = providerError.retryable && email.attempts < MAX_OUTBOX_ATTEMPTS;
    const failedAt = now();
    await dependencies.store.markFailure({
      id: email.id,
      status: retry ? 'retry' : 'failed',
      attempts: email.attempts,
      lastError: providerError.code,
      ...(retry ? { scheduledFor: new Date(failedAt.getTime() + retryDelayMs(email.attempts)).toISOString() } : {}),
    });
    return { status: retry ? 'retry' : 'failed', errorCode: providerError.code };
  }

  try {
    await dependencies.store.markDelivered(email.id, providerMessageId, now().toISOString());
  } catch {
    // The provider may have accepted the message. Leave the row for lease recovery;
    // the stable provider idempotency key prevents a second delivery.
    throw new Error('OUTBOX_DELIVERY_STATE_WRITE_FAILED');
  }
  return { status: 'delivered' };
}

export function createResendEmailProvider(apiKey: string, emailFrom: string, fetchImpl: typeof fetch = fetch): EmailProvider {
  return {
    async send(email, idempotencyKey) {
      let response: Response;
      try {
        response = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify({
            from: emailFrom,
            to: email.recipient || email.to,
            subject: email.subject,
            ...(email.body_html ? { html: email.body_html } : { text: email.body || '' }),
          }),
          signal: AbortSignal.timeout(30_000),
        });
      } catch {
        throw new EmailProviderError('EMAIL_PROVIDER_TEMPORARY', true);
      }

      let responseData: any = null;
      try {
        responseData = await response.json();
      } catch {
        if (response.ok) throw new EmailProviderError('EMAIL_PROVIDER_UNCONFIRMED', true);
      }
      if (!response.ok) {
        const isConcurrentIdempotentRequest = response.status === 409
          && responseData?.name === 'concurrent_idempotent_requests';
        const retryable = response.status === 408
          || response.status === 429
          || response.status >= 500
          || isConcurrentIdempotentRequest;
        throw new EmailProviderError(
          response.status === 429 ? 'EMAIL_PROVIDER_RATE_LIMITED'
            : retryable ? 'EMAIL_PROVIDER_TEMPORARY' : 'EMAIL_PROVIDER_REJECTED',
          retryable,
        );
      }
      if (typeof responseData?.id !== 'string' || responseData.id.length === 0) {
        throw new EmailProviderError('EMAIL_PROVIDER_UNCONFIRMED', true);
      }
      return { id: responseData.id };
    },
  };
}
