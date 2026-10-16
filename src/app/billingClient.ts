import { supabase } from '@/lib/supabase';

export async function startSubscriptionCheckout(): Promise<void> {
  if (!supabase) throw new Error('Platba není v tomto prostředí dostupná.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Přihlášení vypršelo. Přihlaste se znovu.');
  const response = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.url !== 'string') {
    throw new Error(payload?.code === 'BILLING_NOT_CONFIGURED'
      ? 'Platba zatím není nakonfigurovaná. Kontaktujte podporu StavbaFlow.'
      : 'Platební stránku se nepodařilo otevřít. Zkuste to znovu.');
  }
  const target = new URL(payload.url);
  if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') {
    throw new Error('Platební služba vrátila neplatný odkaz.');
  }
  window.location.assign(target.toString());
}
