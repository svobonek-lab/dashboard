import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { chmod, lstat, readFile } from 'node:fs/promises';

export interface ConnectorIdentity {
  algorithm: 'HMAC-SHA256';
  secret: string;
}

export interface SigningRequest {
  method: string;
  pathname: string;
  timestamp: string;
  requestId: string;
  body: string | Uint8Array;
}

export interface SignedRequest {
  algorithm: 'HMAC-SHA256';
  signature: string;
}

function secretBytes(value: string): Buffer {
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== value) throw new Error('connector secret file is invalid');
  return bytes;
}

export function canonicalSigningInput(request: SigningRequest): string {
  if (!request.method.trim() || !request.pathname.startsWith('/') || !request.requestId.trim()) {
    throw new Error('request method, pathname and requestId are required');
  }
  const timestamp = new Date(request.timestamp);
  if (Number.isNaN(timestamp.valueOf())) throw new Error('request timestamp must be ISO-8601');
  const body = typeof request.body === 'string' ? Buffer.from(request.body, 'utf8') : request.body;
  const digest = createHash('sha256').update(body).digest('hex');
  return [request.method.trim().toUpperCase(), request.pathname, timestamp.toISOString(), request.requestId.trim(), digest].join('\n');
}

export async function loadIdentity(path: string): Promise<ConnectorIdentity> {
  try {
    if (!(await lstat(path)).isFile()) throw new Error('connector secret file is invalid');
    const secret = (await readFile(path, 'utf8')).trim();
    secretBytes(secret);
    await chmod(path, 0o600);
    return { algorithm: 'HMAC-SHA256', secret };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('connector secret file is unavailable');
    if (error instanceof Error && error.message === 'connector secret file is invalid') throw error;
    throw new Error('connector secret file is invalid');
  }
}

export function signRequest(identity: ConnectorIdentity, request: SigningRequest): SignedRequest {
  const signature = createHmac('sha256', secretBytes(identity.secret)).update(canonicalSigningInput(request), 'utf8').digest('base64');
  return { algorithm: 'HMAC-SHA256', signature };
}

export function fingerprintSecret(secret: string): string {
  return createHash('sha256').update(secretBytes(secret)).digest('hex');
}

export function verifyRequest(secret: string, request: SigningRequest, signature: string): boolean {
  try {
    const key = secretBytes(secret);
    const provided = Buffer.from(signature, 'base64');
    if (provided.length !== 32 || provided.toString('base64') !== signature) return false;
    const expected = createHmac('sha256', key).update(canonicalSigningInput(request), 'utf8').digest();
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}
