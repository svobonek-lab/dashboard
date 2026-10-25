import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface StoredConnectorIdentity {
  connectorId: string;
  companyId: string;
  /** Decrypted only for the duration of request authentication. */
  secret: string;
  revoked: boolean;
  scopes: string[];
}

export type AuthenticatedConnectorIdentity = Omit<StoredConnectorIdentity, 'secret'>;

export class ConnectorRequestError extends Error {
  constructor(readonly code: string, readonly status = 401) {
    super(code);
    this.name = 'ConnectorRequestError';
  }
}

type Headers = Record<string, string | string[] | undefined>;

function header(headers: Headers, name: string): string {
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
  return Array.isArray(entry) ? String(entry[0] ?? '') : String(entry ?? '');
}

function safeId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,160}$/.test(value);
}

function signedInput(method: string, pathname: string, timestamp: string, requestId: string, body: string): Buffer {
  const digest = createHash('sha256').update(body, 'utf8').digest('hex');
  return Buffer.from(`${method.trim().toUpperCase()}\n${pathname}\n${new Date(timestamp).toISOString()}\n${requestId}\n${digest}`, 'utf8');
}

export interface AuthenticateConnectorOptions {
  method: string;
  pathname: string;
  headers: Headers;
  rawBody: string;
  body: Record<string, unknown>;
  now?: Date;
  requiredScope: string;
  identity: StoredConnectorIdentity | null;
  reserveNonce: (connectorId: string, requestId: string, expiresAt: Date) => Promise<boolean>;
}

export async function authenticateConnectorRequest(options: AuthenticateConnectorOptions): Promise<AuthenticatedConnectorIdentity> {
  const connectorId = header(options.headers, 'x-sf-connector-id');
  const timestamp = header(options.headers, 'x-sf-timestamp');
  const requestId = header(options.headers, 'x-sf-request-id');
  const signature = header(options.headers, 'x-sf-signature');
  const identity = options.identity;
  if (!safeId(connectorId) || !safeId(requestId) || !timestamp || !signature || !identity || identity.connectorId !== connectorId || identity.revoked) {
    throw new ConnectorRequestError(identity?.revoked ? 'CONNECTOR_REVOKED' : 'CONNECTOR_SIGNATURE_INVALID');
  }
  const signedAt = new Date(timestamp);
  const now = options.now ?? new Date();
  if (Number.isNaN(signedAt.valueOf()) || Math.abs(now.valueOf() - signedAt.valueOf()) > 5 * 60 * 1000) {
    throw new ConnectorRequestError('CONNECTOR_TIMESTAMP_INVALID');
  }
  if (!identity.scopes.includes(options.requiredScope)) throw new ConnectorRequestError('CONNECTOR_SCOPE_DENIED', 403);
  if (options.body.connectorId !== undefined && options.body.connectorId !== identity.connectorId) throw new ConnectorRequestError('CONNECTOR_TENANT_MISMATCH', 403);
  if (options.body.companyId !== undefined && options.body.companyId !== identity.companyId) throw new ConnectorRequestError('CONNECTOR_TENANT_MISMATCH', 403);

  const key = Buffer.from(identity.secret, 'base64url');
  const provided = Buffer.from(signature, 'base64');
  let valid = false;
  if (key.length === 32 && key.toString('base64url') === identity.secret && provided.length === 32 && provided.toString('base64') === signature) {
    const expected = createHmac('sha256', key).update(signedInput(options.method, options.pathname, timestamp, requestId, options.rawBody)).digest();
    valid = timingSafeEqual(expected, provided);
  }
  if (!valid) throw new ConnectorRequestError('CONNECTOR_SIGNATURE_INVALID');
  if (!await options.reserveNonce(identity.connectorId, requestId, new Date(now.valueOf() + 10 * 60 * 1000))) {
    throw new ConnectorRequestError('CONNECTOR_REPLAYED', 409);
  }
  return { connectorId: identity.connectorId, companyId: identity.companyId, revoked: identity.revoked, scopes: identity.scopes };
}
