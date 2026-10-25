import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey(encoded = process.env.CONNECTOR_SECRET_ENCRYPTION_KEY): Buffer {
  if (!encoded) throw new Error('CONNECTOR_SECRET_CONFIGURATION_MISSING');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32 || key.toString('base64') !== encoded) throw new Error('CONNECTOR_SECRET_CONFIGURATION_INVALID');
  return key;
}

export function encryptConnectorSecret(secret: string, encodedKey?: string): string {
  const secretBytes = Buffer.from(secret, 'base64url');
  if (secretBytes.length !== 32 || secretBytes.toString('base64url') !== secret) throw new Error('CONNECTOR_SECRET_INVALID');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(secretBytes), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptConnectorSecret(envelope: string, encodedKey?: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] = envelope.split('.');
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext || extra.length) throw new Error('CONNECTOR_SECRET_ENVELOPE_INVALID');
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(encodedKey), Buffer.from(encodedIv, 'base64url'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encodedCiphertext, 'base64url')), decipher.final()]);
    if (plaintext.length !== 32) throw new Error('invalid secret length');
    return plaintext.toString('base64url');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CONNECTOR_SECRET_CONFIGURATION_')) throw error;
    throw new Error('CONNECTOR_SECRET_DECRYPT_FAILED');
  }
}

export function fingerprintConnectorSecret(secret: string): string {
  const bytes = Buffer.from(secret, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== secret) throw new Error('CONNECTOR_SECRET_INVALID');
  return createHash('sha256').update(bytes).digest('hex');
}
