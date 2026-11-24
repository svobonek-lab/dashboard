import { supabase } from '@/shared/api/supabase';

function checkoutRequestId(storage: Storage, storageKey: string): string {
  let requestId = storage.getItem(storageKey) || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    requestId = crypto.randomUUID();
    storage.setItem(storageKey, requestId);
  }
  return requestId;
}

function redirectToStripeCheckout(url: unknown): void {
  if (typeof url !== 'string') throw new Error('Platební stránku se nepodařilo otevřít.');
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com') {
    throw new Error('Platební služba vrátila neplatný odkaz.');
  }
  window.location.assign(target.toString());
}

export async function startSubscriptionCheckout(): Promise<void> {
  if (!supabase) throw new Error('Platba není v tomto prostředí dostupná.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Přihlášení vypršelo. Přihlaste se znovu.');
  const storageKey = 'stavbaflow_checkout_request_id';
  const requestId = checkoutRequestId(sessionStorage, storageKey);
  const response = await fetch('/api/stripe-checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-StavbaFlow-Idempotency-Key': requestId },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.url !== 'string') {
    const message = payload?.code === 'BILLING_NOT_CONFIGURED'
      ? 'Platba zatím není nakonfigurovaná. Kontaktujte podporu StavbaFlow.'
      : payload?.code === 'BILLING_PLAN_UNAVAILABLE'
        ? 'Tento tarif zatím nelze zaplatit. Požádejte správce firmy o nastavení dostupného tarifu.'
        : 'Platební stránku se nepodařilo otevřít. Zkuste to znovu.';
    throw new Error(message);
  }
  sessionStorage.removeItem(storageKey);
  redirectToStripeCheckout(payload.url);
}

export async function startSetupFeeCheckout(): Promise<void> {
  if (!supabase) throw new Error('Platba není v tomto prostředí dostupná.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Přihlášení vypršelo. Přihlaste se znovu.');
  const storageKey = 'stavbaflow_setup_checkout_request_id';
  const requestId = checkoutRequestId(localStorage, storageKey);
  const response = await fetch('/api/stripe-setup-checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-StavbaFlow-Idempotency-Key': requestId },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.url !== 'string') {
    if (payload?.code === 'BILLING_SETUP_SESSION_EXPIRED') localStorage.removeItem(storageKey);
    const message = payload?.code === 'BILLING_NOT_CONFIGURED' || payload?.code === 'SETUP_PAYMENT_DISABLED'
      ? 'Jednorázovou platbu zatím nelze otevřít. Aktivace se připravuje.'
      : payload?.code === 'BILLING_SETUP_NOT_REQUIRED'
        ? 'Tento firemní prostor už je aktivní nebo používá jiný tarif.'
        : payload?.code === 'BILLING_SETUP_SESSION_EXPIRED'
          ? 'Platební odkaz vypršel. Zavřete tuto zprávu a otevřete novou platbu.'
          : payload?.code === 'BILLING_SETUP_SESSION_COMPLETE'
            ? 'Platba už proběhla. Čekáme na její potvrzení od Stripe.'
        : 'Platební stránku se nepodařilo otevřít. Zkuste to znovu.';
    throw new Error(message);
  }
  // Keep this tenant-scoped idempotency key across the redirect so a canceled
  // Checkout reuses the still-open Stripe session instead of charging twice.
  redirectToStripeCheckout(payload.url);
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
