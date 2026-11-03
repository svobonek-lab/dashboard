import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function normalizeKey(input: Buffer | string | undefined): Buffer {
  let key: Buffer;
  if (Buffer.isBuffer(input)) key = input;
  else if (typeof input === 'string') {
    try {
      key = Buffer.from(input, 'base64');
      if (!input || key.toString('base64') !== input) throw new Error();
    } catch { throw new Error('EMAIL_LINK_ENCRYPTION_KEY_INVALID'); }
  } else {
    throw new Error('EMAIL_LINK_ENCRYPTION_KEY_INVALID');
  }
  if (key.length !== 32) throw new Error('EMAIL_LINK_ENCRYPTION_KEY_INVALID');
  return key;
}

export function encryptInviteLink(link: string, keyInput: Buffer | string | undefined): string {
  if (typeof link !== 'string' || !/^https:\/\//i.test(link)) throw new Error('INVITE_LINK_INVALID');
  const key = normalizeKey(keyInput);
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, nonce);
  const ciphertext = Buffer.concat([cipher.update(link, 'utf8'), cipher.final()]);
  return ['v1', nonce.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptInviteLink(envelope: string, keyInput: Buffer | string | undefined): string {
  try {
    const [version, noncePart, tagPart, ciphertextPart, extra] = String(envelope).split('.');
    if (version !== 'v1' || !noncePart || !tagPart || !ciphertextPart || extra !== undefined) throw new Error();
    const nonce = Buffer.from(noncePart, 'base64url');
    const tag = Buffer.from(tagPart, 'base64url');
    const ciphertext = Buffer.from(ciphertextPart, 'base64url');
    if (nonce.length !== 12 || tag.length !== 16 || ciphertext.length === 0) throw new Error();
    const decipher = createDecipheriv(ALGORITHM, normalizeKey(keyInput), nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    if (!/^https:\/\//i.test(plaintext)) throw new Error();
    return plaintext;
  } catch {
    throw new Error('INVITE_LINK_CIPHERTEXT_INVALID');
  }
}
