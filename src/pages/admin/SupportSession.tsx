import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { OrganizationContext, useOrganization } from '@/context/OrganizationContext';
import { OwnerLayout } from '@/src/layouts/OwnerLayout';
import { getPlatformSupportSession, revokePlatformSupportSession, type PlatformSupportSession } from '../../app/platformClient';
import { useRouter } from '../../app/router';

const STORAGE_KEY = 'stavbaflow_platform_support_session';

export const AdminSupportSessionPage: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const organization = useOrganization();
  const { navigate } = useRouter();
  const [session, setSession] = useState<PlatformSupportSession | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const remaining = useMemo(() => session ? Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - now) / 60000)) : 0, [now, session]);

  const leaveSupport = useCallback(async (revoke = true) => {
    try {
      if (revoke) await revokePlatformSupportSession(sessionId);
    } finally {
      sessionStorage.removeItem(STORAGE_KEY);
      navigate('/admin/companies', { replace: true });
    }
  }, [navigate, sessionId]);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || stored.id !== sessionId || new Date(stored.expiresAt).getTime() <= Date.now()) {
        setError('Dočasná relace v tomto prohlížeči chybí nebo vypršela.');
        return;
      }
    } catch {
      setError('Dočasnou relaci se nepodařilo bezpečně ověřit.');
      return;
    }
    getPlatformSupportSession(sessionId)
      .then(setSession)
      .catch((value) => setError(value instanceof Error ? value.message : 'Relace podpory není dostupná.'));
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session && new Date(session.expires_at).getTime() <= now) void leaveSupport(false);
  }, [leaveSupport, now, session]);

  if (error) return <main className="min-h-screen bg-slate-950 p-6 text-white"><section className="mx-auto mt-24 max-w-xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-rose-100"><h1 className="text-xl font-black">Přístup byl odmítnut</h1><p className="mt-2 text-sm">{error}</p><button onClick={() => navigate('/admin/companies')} className="mt-5 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-bold">Vrátit se do Adminu</button></section></main>;
  if (!session) return <div className="min-h-screen bg-slate-950 py-20 text-center text-sm text-slate-400">Ověřuji auditovanou relaci…</div>;

  const supportContext = {
    ...organization,
    currentOrg: {
      id: session.company_id,
      name: session.company_name || 'Zákaznická firma',
      slug: 'support-workspace',
      primary_color: '#2563eb',
      plan: session.subscription_status || 'Neznámý',
    },
    impersonatingOrgId: session.company_id,
    stopImpersonation: () => void leaveSupport(),
  };

  return (
    <OrganizationContext.Provider value={supportContext}>
      <OwnerLayout readOnlyMode="support" onExitReadOnly={() => void leaveSupport()}>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-amber-700" /><div><strong className="text-slate-950">Auditovaný režim podpory · pouze pro čtení</strong><p className="mt-1 text-sm text-amber-900/75">Relace je vázaná na váš administrátorský účet, tuto firmu a automaticky vyprší.</p></div></div>
            <button onClick={() => void leaveSupport()} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Vrátit se do Adminu</button>
          </div>
          <header><p className="workspace-kicker">Provozní pohled firmy</p><h1 className="workspace-title">{session.company_name || 'Zákaznická firma'}</h1><p className="workspace-subtitle">Podpora vidí provozní stav účtu. Kontakty, zakázky, ceny a další obchodní řádky zůstávají nepřístupné.</p></header>
          <div className="grid gap-4 sm:grid-cols-3"><Card icon={Users} label="Aktivní uživatelé" value={String(session.member_count ?? 0)} /><Card icon={Clock3} label="Zbývající čas" value={`${remaining} min`} /><Card icon={LockKeyhole} label="Oprávnění" value="Read-only" /></div>
          <section className="workspace-panel p-6"><h2 className="font-bold text-slate-950">Bezpečný rozsah podpory</h2><ul className="mt-4 space-y-3 text-sm text-slate-600"><li>• kontrola stavu účtu a počtu členů</li><li>• kontrola provozního nastavení bez tajných klíčů</li><li>• každé otevření a ukončení se zaznamená do auditu</li></ul></section>
        </div>
      </OwnerLayout>
    </OrganizationContext.Provider>
  );
};

const Card: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = ({ icon: Icon, label, value }) => <div className="workspace-panel p-5"><Icon className="h-5 w-5 text-blue-600" /><p className="mt-4 text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>;
