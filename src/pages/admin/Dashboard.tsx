import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Database, FileCheck2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { listPlatformCompanies, type PlatformCompany } from '../../app/platformClient';
import { useRouter } from '../../app/router';

export const AdminDashboardPage: React.FC = () => {
  const { navigate } = useRouter();
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { listPlatformCompanies().then(setCompanies).catch((reason) => setError(reason instanceof Error ? reason.message : 'Přehled není dostupný.')).finally(() => setLoading(false)); }, []);
  const ready = companies.filter((company) => company.onboarding_completed).length;
  return <div className="space-y-7"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">StavbaFlow control plane</p><h1 className="mt-2 text-3xl font-black text-white">Přehled platformy</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Ověřený provozní pohled bez zákaznických poptávek, kontaktů a finančních údajů.</p></div>
    {error && <div className="flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100"><TriangleAlert className="h-5 w-5 shrink-0" />{error}</div>}
    <div className="grid gap-4 md:grid-cols-3"><Metric icon={Building2} label="Evidované firmy" value={loading ? '—' : String(companies.length)} /><Metric icon={CheckCircle2} label="Dokončený onboarding" value={loading ? '—' : String(ready)} /><Metric icon={Database} label="Integrace" value="Neověřeno" /></div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-3xl border border-slate-800 bg-[#0C111D] p-6"><ShieldCheck className="h-6 w-6 text-blue-300" /><h2 className="mt-4 text-lg font-bold text-white">Oddělená oprávnění</h2><p className="mt-2 text-sm leading-6 text-slate-400">Správce platformy má přístup pouze k provozním metadatům. Členství a data zákaznických firem zůstávají pod tenantovým RLS.</p></section><section className="rounded-3xl border border-slate-800 bg-[#0C111D] p-6"><FileCheck2 className="h-6 w-6 text-emerald-300" /><h2 className="mt-4 text-lg font-bold text-white">Stav prodeje</h2><p className="mt-2 text-sm leading-6 text-slate-400">Před ostrým nasazením zbývá ručně ověřit stagingový registr administrátora, rotaci klíče a přesný produkční release.</p><button onClick={() => navigate('/admin/companies')} className="mt-5 rounded-xl bg-blue-500 px-4 py-2 text-xs font-black text-white hover:bg-blue-400">Zkontrolovat firmy</button></section></div>
  </div>;
};

const Metric: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = ({ icon: Icon, label, value }) => <div className="rounded-3xl border border-slate-800 bg-[#0C111D] p-5"><Icon className="h-5 w-5 text-blue-300" /><p className="mt-4 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>;
