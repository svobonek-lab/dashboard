import React, { useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { listPlatformCompanies, type PlatformCompany } from '../../app/platformClient';

export const AdminCompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const load = () => { setLoading(true); setError(''); listPlatformCompanies().then(setCompanies).catch((reason) => setError(reason instanceof Error ? reason.message : 'Adresář není dostupný.')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const visible = useMemo(() => companies.filter((company) => `${company.name} ${company.slug}`.toLowerCase().includes(search.trim().toLowerCase())), [companies, search]);
  return <div className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Minimální provozní metadata</p><h1 className="mt-2 text-3xl font-black text-white">Zákaznické firmy</h1><p className="mt-2 text-sm text-slate-400">Adresář nezobrazuje kontakty, zakázky ani obchodní hodnoty zákazníků.</p></div>
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100"><strong>Podpora pouze pro čtení.</strong> Otevření zákaznického workspace není dostupné, dokud staging neověří časově omezené auditované relace.</div>
    <div className="flex gap-3 rounded-2xl border border-slate-800 bg-[#0C111D] p-3"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat firmu" className="w-full rounded-xl border border-slate-800 bg-[#090D16] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500" /></label><button onClick={load} className="rounded-xl border border-slate-700 px-3 text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    {error && <div className="flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100"><ShieldAlert className="h-5 w-5" />{error}</div>}
    {!loading && !error && visible.length === 0 && <div className="rounded-3xl border border-slate-800 bg-[#0C111D] p-10 text-center text-sm text-slate-400">Žádná firma neodpovídá filtru.</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((company) => <article key={company.id} className="rounded-3xl border border-slate-800 bg-[#0C111D] p-5"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300"><Building2 className="h-5 w-5" /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${company.active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>{company.active ? 'Aktivní' : 'Pozastavená'}</span></div><h2 className="mt-4 font-bold text-white">{company.name}</h2><p className="mt-1 text-xs text-slate-500">{company.slug}</p><dl className="mt-5 space-y-2 text-xs"><Row label="Onboarding" value={company.onboarding_completed ? 'Dokončen' : 'Čeká na dokončení'} /><Row label="Integrace" value={company.integration_status === 'not_verified' ? 'Neověřeno' : company.integration_status} /><Row label="Založeno" value={company.created_at ? new Date(company.created_at).toLocaleDateString('cs-CZ') : 'Neznámé'} /></dl></article>)}</div>
  </div>;
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="flex justify-between gap-4 border-t border-slate-800 pt-2"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-300">{value}</dd></div>;
