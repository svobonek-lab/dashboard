import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { getPlatformSupportSession, revokePlatformSupportSession, type PlatformSupportSession } from '../../app/platformClient';
import { useRouter } from '../../app/router';

export const AdminSupportSessionPage: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { navigate } = useRouter();
  const [session, setSession] = useState<PlatformSupportSession | null>(null);
  const [error, setError] = useState('');
  const remaining = useMemo(() => session ? Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - Date.now()) / 60000)) : 0, [session]);
  useEffect(() => { getPlatformSupportSession(sessionId).then(setSession).catch((value) => setError(value instanceof Error ? value.message : 'Relace podpory není dostupná.')); }, [sessionId]);
  const close = async () => { try { await revokePlatformSupportSession(sessionId); } finally { navigate('/admin/companies', { replace: true }); } };
  if (error) return <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-rose-100"><h1 className="text-xl font-black">Přístup byl odmítnut</h1><p className="mt-2 text-sm">{error}</p><button onClick={() => navigate('/admin/companies')} className="mt-5 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-bold">Zpět na firmy</button></section>;
  if (!session) return <div className="py-20 text-center text-sm text-slate-400">Ověřuji auditovanou relaci…</div>;
  return <div className="space-y-6"><div className="flex flex-col gap-4 rounded-3xl border border-amber-400/25 bg-amber-400/5 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-amber-300" /><div><strong className="text-white">Režim podpory · pouze pro čtení</strong><p className="mt-1 text-sm text-amber-100/75">Relace je vázaná na váš účet, tuto firmu a vyprší nejpozději za 30 minut.</p></div></div><button onClick={close} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950">Ukončit relaci</button></div><header><p className="text-xs font-bold text-blue-300">Provozní pohled firmy</p><h1 className="mt-2 text-3xl font-black text-white">{session.company_name || 'Zákaznická firma'}</h1><p className="mt-2 text-sm text-slate-400">Tento pohled neobsahuje klientské kontakty, zakázky ani ceny.</p></header><div className="grid gap-4 sm:grid-cols-3"><Card icon={Users} label="Aktivní uživatelé" value={String(session.member_count ?? 0)} /><Card icon={Clock3} label="Zbývající čas" value={`${remaining} min`} /><Card icon={LockKeyhole} label="Oprávnění" value="Read-only" /></div><section className="rounded-3xl border border-slate-800 bg-[#0C111D] p-6"><h2 className="font-bold text-white">Bezpečný rozsah podpory</h2><ul className="mt-4 space-y-3 text-sm text-slate-400"><li>• kontrola stavu účtu a počtu členů</li><li>• kontrola provozního nastavení bez tajných klíčů</li><li>• každé otevření a ukončení se zaznamená do auditu</li></ul></section></div>;
};

const Card: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = ({ icon: Icon, label, value }) => <div className="rounded-3xl border border-slate-800 bg-[#0C111D] p-5"><Icon className="h-5 w-5 text-blue-300" /><p className="mt-4 text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>;
