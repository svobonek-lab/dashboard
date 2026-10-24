import type { OwnerLegalConsent } from '../shared/model/legalConsent';
export type { OwnerLegalConsent } from '../shared/model/legalConsent';

const MAX_CAPTURE_AGE_MS = 15 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

export function createOwnerLegalConsent(): OwnerLegalConsent {
  return { termsAccepted: true, dpaAccepted: true, acceptedAt: new Date().toISOString() };
}

export function hasOwnerLegalConsent(value: unknown, now = Date.now()): value is OwnerLegalConsent {
  if (!value || typeof value !== 'object') return false;
  const consent = value as Partial<OwnerLegalConsent>;
  if (consent.termsAccepted !== true || consent.dpaAccepted !== true || typeof consent.acceptedAt !== 'string') return false;
  const acceptedAt = Date.parse(consent.acceptedAt);
  return Number.isFinite(acceptedAt) && acceptedAt >= now - MAX_CAPTURE_AGE_MS && acceptedAt <= now + MAX_CLOCK_SKEW_MS;
}