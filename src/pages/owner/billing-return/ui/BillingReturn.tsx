import React from 'react';
import { CheckCircle2, CreditCard, XCircle } from 'lucide-react';

import { useRouter } from '@/shared/lib/router';

export const BillingReturnPage: React.FC = () => {
  const { search, navigate } = useRouter();
  const succeeded = new URLSearchParams(search).get('status') === 'success';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6 py-16 text-slate-950">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${succeeded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {succeeded ? <CheckCircle2 aria-hidden="true" className="h-6 w-6" /> : <XCircle aria-hidden="true" className="h-6 w-6" />}
        </div>
        <p className="mt-6 text-xs font-bold text-slate-500">StavbaFlow fakturace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{succeeded ? 'Platba byla přijata' : 'Platba byla zrušena'}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {succeeded
            ? 'Předplatné se aktivuje až po bezpečném potvrzení Stripe webhookem. Kontrola stavu může trvat několik sekund.'
            : 'Předplatné se nezměnilo. Platební stránku můžete znovu otevřít z obrazovky předplatného.'}
        </p>
        <button
          type="button"
          onClick={() => { if (succeeded) window.location.assign('/dashboard'); else navigate('/dashboard', { replace: true }); }}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
        >
          <CreditCard aria-hidden="true" className="h-4 w-4" />
          {succeeded ? 'Zkontrolovat aktivaci' : 'Zpět k předplatnému'}
        </button>
      </section>
    </main>
  );
};
