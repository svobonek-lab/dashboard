export type SalesContactMode = {
  mode: 'booking' | 'email' | 'unavailable';
  target: string;
};

type SalesContactEnv = {
  VITE_BOOKING_URL?: string;
  VITE_COMPANY_EMAIL?: string;
};

export type SalesContactDraft = {
  name: string;
  company: string;
  phone: string;
  email: string;
  preferredTime: string;
};

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSalesContactMode(env: SalesContactEnv): SalesContactMode {
  const bookingUrl = String(env.VITE_BOOKING_URL || '').trim();
  if (isHttpsUrl(bookingUrl)) return { mode: 'booking', target: bookingUrl };

  const email = String(env.VITE_COMPANY_EMAIL || '').trim().toLowerCase();
  if (email && email !== 'doplnit' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { mode: 'email', target: email };
  }

  return { mode: 'unavailable', target: '' };
}

export function buildSalesContact(targetEmail: string, draft: SalesContactDraft): string {
  const subject = `StavbaFlow pilot – ${draft.company.trim() || draft.name.trim()}`;
  const body = [
    `Jméno: ${draft.name.trim()}`,
    `Firma: ${draft.company.trim()}`,
    `Telefon: ${draft.phone.trim()}`,
    `E-mail: ${draft.email.trim()}`,
    `Preferovaný termín: ${draft.preferredTime.trim()}`,
    '',
    'Mám zájem o nezávaznou ukázku 30denního pilotu StavbaFlow.'
  ].join('\n');

  return `mailto:${targetEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
