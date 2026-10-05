import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
} from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface ConnectorIdentity {
  algorithm: 'Ed25519';
  publicKey: string;
  privateKey: string;
  createdAt: string;
}

export interface SigningRequest {
  method: string;
  pathname: string;
  timestamp: string;
  requestId: string;
  body: string | Uint8Array;
}

export interface SignedRequest {
  algorithm: 'Ed25519';
  signature: string;
}

function isIdentity(value: unknown): value is ConnectorIdentity {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ConnectorIdentity>;
  return candidate.algorithm === 'Ed25519'
    && typeof candidate.publicKey === 'string'
    && candidate.publicKey.includes('BEGIN PUBLIC KEY')
    && typeof candidate.privateKey === 'string'
    && candidate.privateKey.includes('BEGIN PRIVATE KEY')
    && typeof candidate.createdAt === 'string';
}

function bodyBytes(body: string | Uint8Array): Uint8Array {
  return typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
}

export function canonicalSigningInput(request: SigningRequest): string {
  if (!request.method.trim() || !request.pathname.startsWith('/') || !request.requestId.trim()) {
    throw new Error('request method, pathname and requestId are required');
  }
  const timestamp = new Date(request.timestamp);
  if (Number.isNaN(timestamp.valueOf())) throw new Error('request timestamp must be ISO-8601');
  const digest = createHash('sha256').update(bodyBytes(request.body)).digest('hex');
  return [
    request.method.trim().toUpperCase(),
    request.pathname,
    timestamp.toISOString(),
    request.requestId.trim(),
    digest,
  ].join('\n');
}

export async function loadOrCreateIdentity(path: string): Promise<ConnectorIdentity> {
  try {
    const saved = JSON.parse(await readFile(path, 'utf8')) as unknown;
    if (!isIdentity(saved)) throw new Error('connector identity file is invalid');
    await chmod(path, 0o600);
    return saved;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }

  const keys = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const identity: ConnectorIdentity = {
    algorithm: 'Ed25519',
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    createdAt: new Date().toISOString(),
  };
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(path, `${JSON.stringify(identity)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const saved = JSON.parse(await readFile(path, 'utf8')) as unknown;
    if (!isIdentity(saved)) throw new Error('connector identity file is invalid');
    await chmod(path, 0o600);
    return saved;
  }
  await chmod(path, 0o600);
  return identity;
}

export function signRequest(identity: ConnectorIdentity, request: SigningRequest): SignedRequest {
  const signature = sign(null, Buffer.from(canonicalSigningInput(request), 'utf8'), identity.privateKey);
  return { algorithm: 'Ed25519', signature: signature.toString('base64') };
}

export function verifyRequest(publicKey: string, request: SigningRequest, signature: string): boolean {
  try {
    return verify(
      null,
      Buffer.from(canonicalSigningInput(request), 'utf8'),
      publicKey,
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}
