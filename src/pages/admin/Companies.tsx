import React, { useEffect, useMemo, useState } from 'react';
import { Building2, LogIn, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { createPlatformSupportSession, listPlatformCompanies, type PlatformCompany } from '../../app/platformClient';
import { useRouter } from '../../app/router';

const SUBSCRIPTIONS: Record<PlatformCompany['subscription_status'], string> = {
  not_configured: 'Nenastaveno', trial: 'Pilot', active: 'Aktivní', past_due: 'Po splatnosti', cancelled: 'Ukončeno',
};

export const AdminCompaniesPage: React.FC = () => {
  const { navigate } = useRouter();
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PlatformCompany | null>(null);
  const [reason, setReason] = useState('');
  const [creating, setCreating] = useState(false);
  const load = () => { setLoading(true); setError(''); listPlatformCompanies().then(setCompanies).catch((value) => setError(value instanceof Error ? value.message : 'Adresář není dostupný.')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const visible = useMemo(() => companies.filter((company) => `${company.name} ${company.slug}`.toLowerCase().includes(search.trim().toLowerCase())), [companies, search]);
  const startSupport = async () => {
    if (!selected || reason.trim().length < 3) return;
    setCreating(true); setError('');
    try { const session = await createPlatformSupportSession(selected.id, reason); navigate(`/admin/support/${session.id}`); }
    catch (value) { setError(value instanceof Error ? value.message : 'Relaci podpory nelze vytvořit.'); setCreating(false); }
  };

  return <div className="space-y-6">
    <div><p className="text-xs font-bold tracking-[0.16em] text-blue-300">Provozní adresář</p><h1 className="mt-2 text-3xl font-black text-white">Zákaznické firmy</h1><p className="mt-2 text-sm text-slate-400">Kontakty, poptávky, ceny a obsah zakázek zůstávají mimo administraci platformy.</p></div>
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100"><strong>Podpora pouze pro čtení.</strong> Každý vstup vyžaduje důvod, je auditovaný a automaticky vyprší nejpozději za 30 minut.</div>
    <div className="flex gap-3 rounded-2xl border border-slate-800 bg-[#0C111D] p-3"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat firmu" className="w-full rounded-xl border border-slate-800 bg-[#090D16] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500" /></label><button aria-label="Obnovit adresář" onClick={load} className="rounded-xl border border-slate-700 px-3 text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    {error && <div className="flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100"><ShieldAlert className="h-5 w-5" />{error}</div>}
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0C111D]"><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/40 text-xs text-slate-500"><tr><th className="px-5 py-4">Firma</th><th className="px-5 py-4">Uživatelé</th><th className="px-5 py-4">Předplatné</th><th className="px-5 py-4">Vytvořeno</th><th className="px-5 py-4 text-right">Podpora</th></tr></thead><tbody className="divide-y divide-slate-800">{visible.map((company) => <tr key={company.id} className="hover:bg-slate-900/50"><td className="px-5 py-4"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Building2 className="h-4 w-4" /></span><span><strong className="block text-white">{company.name}</strong><small className="text-slate-500">{company.slug} · {company.active ? 'aktivní' : 'pozastavená'}</small></span></span></td><td className="px-5 py-4 font-semibold text-slate-300">{company.member_count}</td><td className="px-5 py-4 text-slate-300">{SUBSCRIPTIONS[company.subscription_status]}</td><td className="px-5 py-4 text-slate-400">{company.created_at ? new Date(company.created_at).toLocaleDateString('cs-CZ') : 'Neznámé'}</td><td className="px-5 py-4 text-right"><button onClick={() => { setSelected(company); setReason(''); }} className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/20"><LogIn className="h-4 w-4" />Přihlásit jako</button></td></tr>)}</tbody></table></div>{!loading && !error && visible.length === 0 && <div className="p-10 text-center text-sm text-slate-400">Žádná firma neodpovídá filtru.</div>}</div>
    {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="support-title" className="w-full max-w-lg rounded-3xl border border-slate-700 bg-[#0C111D] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-blue-300">Auditovaný přístup</p><h2 id="support-title" className="mt-2 text-xl font-black text-white">Přihlásit jako podpora</h2><p className="mt-2 text-sm text-slate-400">{selected.name} · pouze provozní metadata</p></div><button aria-label="Zavřít" onClick={() => setSelected(null)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button></div><label className="mt-6 block text-sm font-semibold text-slate-300">Důvod podpory<textarea autoFocus maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Např. kontrola nastavení integrace po hlášení klienta" className="mt-2 min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500" /></label><p className="mt-2 text-xs text-slate-500">Důvod se uloží do auditu. Relace neuděluje oprávnění k zápisu ani zákaznickým obchodním řádkům.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setSelected(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Zrušit</button><button disabled={creating || reason.trim().length < 3} onClick={startSupport} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{creating ? 'Vytvářím…' : 'Spustit podporu'}</button></div></section></div>}
  </div>;
};
