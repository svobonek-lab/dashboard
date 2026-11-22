import { createCipheriv, createDecipheriv, createHash, publicEncrypt, privateDecrypt, randomBytes } from 'node:crypto';

export const stagingOrigin = 'https://xwzweltjvreqhjpbjrxa.supabase.co';
export const recoveryFormat = 'stavbaflow-synthetic-recovery/v1';
const additionalData = Buffer.from(recoveryFormat);

export function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function sealRecovery(backup, publicKey) {
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(additionalData);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(backup)), cipher.final()]);
  return {
    format: recoveryFormat,
    wrappedKey: publicEncrypt({ key: publicKey, oaepHash: 'sha256' }, key).toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function openRecovery(archive, privateKey) {
  if (archive.format !== recoveryFormat) throw new Error('Unsupported recovery archive format');
  const decode = (field) => Buffer.from(archive[field], 'base64');
  const key = privateDecrypt({ key: privateKey, oaepHash: 'sha256' }, decode('wrappedKey'));
  const cipher = createDecipheriv('aes-256-gcm', key, decode('iv'));
  cipher.setAAD(additionalData);
  cipher.setAuthTag(decode('tag'));
  return JSON.parse(Buffer.concat([cipher.update(decode('ciphertext')), cipher.final()]).toString('utf8'));
}
