import { createHash, createPublicKey, verify } from 'node:crypto';

export interface StoredConnectorIdentity {
  connectorId: string;
  companyId: string;
  publicKey: string;
  revoked: boolean;
  scopes: string[];
}

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
  return Buffer.from(`${method.toUpperCase()}\n${pathname}\n${timestamp}\n${requestId}\n${digest}`, 'utf8');
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

export async function authenticateConnectorRequest(options: AuthenticateConnectorOptions): Promise<StoredConnectorIdentity> {
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
  let valid = false;
  try {
    valid = verify(null, signedInput(options.method, options.pathname, timestamp, requestId, options.rawBody), createPublicKey(identity.publicKey), Buffer.from(signature, 'base64'));
  } catch {
    valid = false;
  }
  if (!valid) throw new ConnectorRequestError('CONNECTOR_SIGNATURE_INVALID');
  if (!await options.reserveNonce(identity.connectorId, requestId, new Date(now.valueOf() + 10 * 60 * 1000))) {
    throw new ConnectorRequestError('CONNECTOR_REPLAYED', 409);
  }
  return identity;
}
