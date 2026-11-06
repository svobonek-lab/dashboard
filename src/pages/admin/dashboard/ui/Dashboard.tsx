import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Database, FileCheck2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { listPlatformCompanies, type PlatformCompany } from '@/features/platform-admin';
import { useRouter } from '@/shared/lib/router';

export const AdminDashboardPage: React.FC = () => {
  const { navigate } = useRouter();
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { listPlatformCompanies().then(setCompanies).catch((reason) => setError(reason instanceof Error ? reason.message : 'Přehled není dostupný.')).finally(() => setLoading(false)); }, []);
  const ready = companies.filter((company) => company.onboarding_completed).length;
  return <div className="workspace-page">
    <header className="workspace-page-header"><div><p className="workspace-kicker">Provozní přehled</p><h1 className="workspace-title">Přehled platformy</h1><p className="workspace-subtitle">Souhrnná metadata firem, onboardingu a integrací.</p></div></header>
    {error && <div role="alert" className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><TriangleAlert className="h-5 w-5 shrink-0" />{error}</div>}
    <div className="grid gap-3 md:grid-cols-3"><Metric icon={Building2} label="Evidované firmy" value={loading ? '—' : String(companies.length)} /><Metric icon={CheckCircle2} label="Dokončený onboarding" value={loading ? '—' : String(ready)} /><Metric icon={Database} label="Integrace" value="Neověřeno" /></div>
    <div className="grid gap-3 lg:grid-cols-2"><section className="workspace-panel p-5 sm:p-6"><ShieldCheck className="h-6 w-6 text-blue-700" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Oddělená oprávnění</h2><p className="mt-2 text-sm leading-6 text-slate-600">Správa platformy pracuje s provozními metadaty. Členství a data zákaznických firem zůstávají chráněná tenantovým RLS.</p></section><section className="workspace-panel p-5 sm:p-6"><FileCheck2 className="h-6 w-6 text-emerald-700" /><h2 className="mt-4 text-lg font-semibold text-slate-950">Stav prodeje</h2><p className="mt-2 text-sm leading-6 text-slate-600">Před ostrým nasazením ověřte produkční nastavení, stagingový registr a finální release.</p><button onClick={() => navigate('/admin/companies')} className="workspace-primary-action mt-5 inline-flex items-center justify-center px-4 text-sm font-semibold">Zkontrolovat firmy</button></section></div>
  </div>;
};

const Metric: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = ({ icon: Icon, label, value }) => <div className="workspace-metric"><span className="workspace-metric-icon bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span><span className="workspace-metric-label">{label}</span><strong>{value}</strong></div>;
