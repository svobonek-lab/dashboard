export class PlatformHttpError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = 'PlatformHttpError';
  }
}

export function requireGet(request: { method?: string }): void {
  if (request.method !== 'GET') throw new PlatformHttpError('METHOD_NOT_ALLOWED', 405);
}

export function platformErrorResponse(error: unknown): { status: number; body: { code: string } } {
  if (error instanceof PlatformHttpError) return { status: error.status, body: { code: error.code } };
  return { status: 500, body: { code: 'PLATFORM_REQUEST_FAILED' } };
}
