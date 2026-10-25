const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
}

export function createRetryingFetch(fetchImpl: typeof fetch, options: RetryOptions = {}): typeof fetch {
  const maxAttempts = positiveInteger(options.maxAttempts, 3);
  const baseDelayMs = nonNegativeNumber(options.baseDelayMs, 100);
  const maxDelayMs = nonNegativeNumber(options.maxDelayMs, 1000);
  const sleep = options.sleep ?? (delayMs => new Promise<void>(resolve => setTimeout(resolve, delayMs)));
  const random = options.random ?? Math.random;

  return async (input, init) => {
    const method = requestMethod(input, init);
    if (method !== 'GET' && method !== 'HEAD') return fetchImpl(input, init);

    let attempt = 0;
    while (true) {
      let response: Response;
      try {
        response = await fetchImpl(input, init);
      } catch (error) {
        if (attempt >= maxAttempts - 1 || !isTransientNetworkError(error)) throw error;
        await sleep(delayForRetry(attempt, baseDelayMs, maxDelayMs, random));
        attempt++;
        continue;
      }

      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= maxAttempts - 1) return response;
      await response.body?.cancel().catch(() => undefined);
      await sleep(delayForRetry(attempt, baseDelayMs, maxDelayMs, random));
      attempt++;
    }
  };
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const method = init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET');
  return method.toUpperCase();
}

function isTransientNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('name' in error && error.name === 'AbortError') return false;
  if (error instanceof TypeError) return true;

  const cause = 'cause' in error ? error.cause : undefined;
  if (!cause || typeof cause !== 'object' || !('code' in cause)) return false;
  return typeof cause.code === 'string' && TRANSIENT_NETWORK_CODES.has(cause.code);
}

function delayForRetry(attempt: number, baseDelayMs: number, maxDelayMs: number, random: () => number): number {
  const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
  const jitter = Math.max(0, Math.min(1, random()));
  return Math.floor(exponentialDelay * jitter);
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : fallback;
}

function nonNegativeNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
