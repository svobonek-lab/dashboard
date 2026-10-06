import { createHmac, timingSafeEqual } from 'node:crypto';

function validSecret(secret: string): boolean {
  return secret.length >= 32;
}

export function createAiInboxToken(companyId: string, secret: string): string {
  if (!validSecret(secret) || !companyId) throw new Error('AI inbox token konfigurace není platná.');
  return createHmac('sha256', secret).update(companyId).digest('hex');
}

export function verifyAiInboxToken(companyId: string, token: string, secret: string): boolean {
  if (!validSecret(secret) || !companyId || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = Buffer.from(createAiInboxToken(companyId, secret), 'hex');
  const actual = Buffer.from(token, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
