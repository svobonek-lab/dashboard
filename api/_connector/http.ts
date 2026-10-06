export class ConnectorHttpError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = 'ConnectorHttpError';
  }
}

export function requirePost(request: { method?: string }): void {
  if (request.method !== 'POST') throw new ConnectorHttpError('METHOD_NOT_ALLOWED', 405);
}

export function parseConnectorBody(request: { body?: unknown }, maximumBytes = 512 * 1024): { body: Record<string, unknown>; rawBody: string } {
  let rawBody: string;
  if (Buffer.isBuffer(request.body)) rawBody = request.body.toString('utf8');
  else if (typeof request.body === 'string') rawBody = request.body;
  else if (request.body && typeof request.body === 'object' && !Array.isArray(request.body)) rawBody = JSON.stringify(request.body);
  else rawBody = '{}';
  if (Buffer.byteLength(rawBody, 'utf8') > maximumBytes) throw new ConnectorHttpError('REQUEST_TOO_LARGE', 413);
  try {
    const body = JSON.parse(rawBody) as unknown;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body must be an object');
    return { body: body as Record<string, unknown>, rawBody };
  } catch {
    throw new ConnectorHttpError('REQUEST_INVALID', 400);
  }
}

export function connectorErrorResponse(error: unknown): { status: number; body: { code: string } } {
  if (error instanceof ConnectorHttpError) return { status: error.status, body: { code: error.code } };
  const candidate = error as { status?: unknown; code?: unknown };
  if (typeof candidate?.status === 'number' && typeof candidate?.code === 'string') {
    return { status: candidate.status, body: { code: candidate.code } };
  }
  return { status: 500, body: { code: 'CONNECTOR_REQUEST_FAILED' } };
}
