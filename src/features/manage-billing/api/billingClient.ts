import { supabase } from '@/shared/api/supabase';

export async function startSubscriptionCheckout(): Promise<void> {
  if (!supabase) throw new Error('Platba není v tomto prostředí dostupná.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Přihlášení vypršelo. Přihlaste se znovu.');
  const storageKey = 'stavbaflow_checkout_request_id';
  let requestId = sessionStorage.getItem(storageKey) || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    requestId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, requestId);
  }
  const response = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-StavbaFlow-Idempotency-Key': requestId },
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
  sessionStorage.removeItem(storageKey);
  window.location.assign(target.toString());
}

export async function startBillingPortal(): Promise<void> {
  if (!supabase) throw new Error('Správa plateb není v tomto prostředí dostupná.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Přihlášení vypršelo. Přihlaste se znovu.');
  const response = await fetch('/api/stripe-portal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.url !== 'string') {
    throw new Error(payload?.code === 'BILLING_CUSTOMER_MISSING'
      ? 'Platební profil ještě nebyl vytvořen.'
      : 'Správu plateb se nepodařilo otevřít.');
  }
  const target = new URL(payload.url);
  if (target.protocol !== 'https:' || target.hostname !== 'billing.stripe.com') {
    throw new Error('Platební služba vrátila neplatný odkaz.');
  }
  window.location.assign(target.toString());
}
