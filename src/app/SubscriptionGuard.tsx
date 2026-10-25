import React, { memo, useCallback, useState } from 'react';
import { CreditCard, LockKeyhole } from 'lucide-react';

import { useOrganization } from '@/entities/session';
import { startSubscriptionCheckout } from '../features/manage-billing';

export type SubscriptionAccess = 'allowed' | 'owner_blocked' | 'employee_blocked';

export function getSubscriptionAccess(status: string | undefined, role: string | undefined): SubscriptionAccess {
  if (status === 'active' || status === 'trialing') return 'allowed';
  return role === 'employee' ? 'employee_blocked' : 'owner_blocked';
}

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

function SubscriptionGuardComponent({ children }: SubscriptionGuardProps) {
  const { currentOrg, dbUser } = useOrganization();
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const access = getSubscriptionAccess(currentOrg?.subscription_status, dbUser?.role);

  const handlePayment = useCallback(async () => {
    if (isOpeningCheckout) return;
    setIsOpeningCheckout(true);
    setCheckoutError('');
    try {
      await startSubscriptionCheckout();
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Platební stránku se nepodařilo otevřít.');
      setIsOpeningCheckout(false);
    }
  }, [isOpeningCheckout]);

  if (access === 'allowed') return <>{children}</>;

  if (access === 'employee_blocked') {
    return (
      <main className="min-h-screen bg-[#f5f5f7] px-6 py-16 text-slate-950 flex items-center justify-center">
        <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <LockKeyhole aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="mt-6 text-2xl font-black tracking-tight">Přístup pozastaven</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Kontaktujte administrátora vaší společnosti. Přístup k systému byl pozastaven.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-6 py-16 text-slate-950 flex items-center justify-center">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <CreditCard aria-hidden="true" className="h-6 w-6" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">StavbaFlow předplatné</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Předplatné vypršelo</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pro obnovení přístupu k firemnímu workspace pokračujte na zabezpečenou platební stránku Stripe.
        </p>
        <button
          type="button"
          onClick={handlePayment}
          disabled={isOpeningCheckout}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
        >
          {isOpeningCheckout ? 'Otevírám platbu…' : 'Přejít k platbě'}
        </button>
        {checkoutError ? <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{checkoutError}</p> : null}
      </section>
    </main>
  );
}

export const SubscriptionGuard = memo(SubscriptionGuardComponent);
