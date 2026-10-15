import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Circle, Copy, LogIn, Mail, Plus, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { createPlatformCompany, createPlatformSupportSession, getPlatformPublicFormLink, listPlatformCompanies, resendPlatformOwnerInvite, revokePlatformSupportSession, type NewPlatformCompany, type PlatformCompany } from '../../app/platformClient';
import { useRouter } from '../../app/router';

const SUBSCRIPTIONS: Record<PlatformCompany['subscription_status'], string> = { not_configured: 'Nenastaveno', pilot: 'Pilot', trial: 'Zkušební', active: 'Aktivní', past_due: 'Po splatnosti', canceled: 'Ukončeno' };
const EMPTY_COMPANY: NewPlatformCompany = { name: '', slug: '', ownerName: '', ownerEmail: '', plan: 'pilot' };

function OnboardingState({ company }: { company: PlatformCompany }) {
  const steps = [
    { done: company.invitation_status !== 'not_sent', label: 'Pozvánka odeslána' },
    { done: company.invitation_status === 'accepted', label: 'Pozvánka přijata' },
    { done: Boolean(company.first_lead_at), label: 'První poptávka' },
  ];
  return <div className="space-y-1.5">{steps.map((step) => <span key={step.label} className={`flex items-center gap-1.5 text-xs ${step.done ? 'text-emerald-300' : 'text-slate-500'}`}>{step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}{step.label}</span>)}</div>;
}

export const AdminCompaniesPage: React.FC = () => {
  const { navigate } = useRouter();
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PlatformCompany | null>(null);
  const [reason, setReason] = useState('');
  const [creatingSupport, setCreatingSupport] = useState(false);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [newCompany, setNewCompany] = useState<NewPlatformCompany>(EMPTY_COMPANY);
  const [savingCompany, setSavingCompany] = useState(false);
  const [busyCompanyId, setBusyCompanyId] = useState('');

  const load = () => { setLoading(true); setError(''); listPlatformCompanies().then(setCompanies).catch((value) => setError(value instanceof Error ? value.message : 'Adresář není dostupný.')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const visible = useMemo(() => companies.filter((company) => `${company.name} ${company.slug}`.toLowerCase().includes(search.trim().toLowerCase())), [companies, search]);

  const submitCompany = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingCompany(true); setError(''); setNotice('');
    try { await createPlatformCompany(newCompany); setShowNewCompany(false); setNewCompany(EMPTY_COMPANY); setNotice('Firma byla vytvořena a vlastníkovi byla odeslána jednorázová pozvánka.'); load(); }
    catch (value) { setError(value instanceof Error ? value.message : 'Firmu se nepodařilo vytvořit.'); }
    finally { setSavingCompany(false); }
  };

  const resendInvite = async (company: PlatformCompany) => {
    setBusyCompanyId(company.id); setError(''); setNotice('');
    try { await resendPlatformOwnerInvite(company.id); setNotice(`Nová pozvánka pro ${company.name} byla odeslána.`); load(); }
    catch (value) { setError(value instanceof Error ? value.message : 'Pozvánku se nepodařilo odeslat.'); }
    finally { setBusyCompanyId(''); }
  };

  const copyFormLink = async (company: PlatformCompany) => {
    setBusyCompanyId(company.id); setError(''); setNotice('');
    try { const link = await getPlatformPublicFormLink(company.id); await navigator.clipboard.writeText(link); setNotice(`Odkaz formuláře pro ${company.name} je zkopírovaný.`); }
    catch (value) { setError(value instanceof Error ? value.message : 'Odkaz se nepodařilo zkopírovat.'); }
    finally { setBusyCompanyId(''); }
  };

  const startSupport = async () => {
    if (!selected || reason.trim().length < 3) return;
    setCreatingSupport(true); setError('');
    try {
      const session = await createPlatformSupportSession(selected.id, reason);
      try { sessionStorage.setItem('stavbaflow_platform_support_session', JSON.stringify({ id: session.id, companyId: session.company_id, companyName: session.company_name || selected.name, expiresAt: session.expires_at })); }
      catch { await revokePlatformSupportSession(session.id).catch(() => undefined); throw new Error('Prohlížeč nemohl bezpečně uložit dočasnou relaci podpory.'); }
      navigate(`/support/${session.id}/dashboard`);
    } catch (value) { setError(value instanceof Error ? value.message : 'Relaci podpory nelze vytvořit.'); setCreatingSupport(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold tracking-[0.16em] text-blue-300">Provozní adresář</p><h1 className="mt-2 text-3xl font-black text-white">Zákaznické firmy</h1><p className="mt-2 text-sm text-slate-400">Založte firmu, pozvěte vlastníka a sledujte první kroky onboardingu.</p></div><button onClick={() => { setShowNewCompany(true); setError(''); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-black text-white hover:bg-blue-400"><Plus className="h-4 w-4" />Nová firma</button></div>
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100"><strong>Auditovaná správa.</strong> Vytvoření firmy, pozvánky, odkazy na formuláře i vstupy podpory se zapisují do provozního auditu.</div>
    <div className="flex gap-3 rounded-2xl border border-slate-800 bg-[#0C111D] p-3"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat firmu" className="w-full rounded-xl border border-slate-800 bg-[#090D16] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500" /></label><button aria-label="Obnovit adresář" onClick={load} className="rounded-xl border border-slate-700 px-3 text-slate-300"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    {error && <div className="flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100"><ShieldAlert className="h-5 w-5 shrink-0" />{error}</div>}
    {notice && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">{notice}</div>}
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0C111D]"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-slate-800 bg-slate-950/40 text-xs text-slate-500"><tr><th className="px-5 py-4">Firma</th><th className="px-5 py-4">Onboarding</th><th className="px-5 py-4">Uživatelé</th><th className="px-5 py-4">Plán</th><th className="px-5 py-4">Akce</th></tr></thead><tbody className="divide-y divide-slate-800">{visible.map((company) => <tr key={company.id} className="align-top hover:bg-slate-900/50"><td className="px-5 py-4"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Building2 className="h-4 w-4" /></span><span><strong className="block text-white">{company.name}</strong><small className="text-slate-500">{company.slug} · {company.active ? 'aktivní' : 'pozastavená'}</small></span></span></td><td className="px-5 py-4"><OnboardingState company={company} /></td><td className="px-5 py-4 font-semibold text-slate-300">{company.member_count}</td><td className="px-5 py-4 text-slate-300">{SUBSCRIPTIONS[company.subscription_status]}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button disabled={busyCompanyId === company.id || company.invitation_status === 'accepted'} onClick={() => resendInvite(company)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"><Mail className="h-3.5 w-3.5" />Znovu poslat pozvánku</button><button disabled={busyCompanyId === company.id} onClick={() => copyFormLink(company)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"><Copy className="h-3.5 w-3.5" />Kopírovat odkaz formuláře</button><button onClick={() => { setSelected(company); setReason(''); }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-400/30 bg-blue-500/10 px-2.5 py-2 text-xs font-bold text-blue-200"><LogIn className="h-3.5 w-3.5" />Přihlásit jako podpora</button></div></td></tr>)}</tbody></table></div>{!loading && !error && visible.length === 0 && <div className="p-10 text-center text-sm text-slate-400">Žádná firma neodpovídá filtru.</div>}</div>
    {showNewCompany && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"><form role="dialog" aria-modal="true" aria-labelledby="new-company-title" onSubmit={submitCompany} className="w-full max-w-xl rounded-3xl border border-slate-700 bg-[#0C111D] p-6 shadow-2xl"><div className="flex justify-between"><div><p className="text-xs font-bold text-blue-300">Onboarding pilota</p><h2 id="new-company-title" className="mt-2 text-xl font-black text-white">Nová firma</h2></div><button type="button" aria-label="Zavřít" onClick={() => setShowNewCompany(false)} className="text-slate-500"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-300">Název firmy<input required minLength={2} maxLength={160} value={newCompany.name} onChange={(event) => setNewCompany({ ...newCompany, name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" /></label><label className="text-sm font-semibold text-slate-300">Identifikátor firmy<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="strechy-novak" value={newCompany.slug} onChange={(event) => setNewCompany({ ...newCompany, slug: event.target.value.toLowerCase() })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" /></label><label className="text-sm font-semibold text-slate-300">Jméno vlastníka<input required minLength={2} maxLength={160} value={newCompany.ownerName} onChange={(event) => setNewCompany({ ...newCompany, ownerName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" /></label><label className="text-sm font-semibold text-slate-300">E-mail vlastníka<input required type="email" value={newCompany.ownerEmail} onChange={(event) => setNewCompany({ ...newCompany, ownerEmail: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white" /></label></div><p className="mt-4 text-xs leading-5 text-slate-500">Po potvrzení vznikne pilotní firemní prostor a vlastník dostane jednorázovou pozvánku. Pokud odeslání selže, firma se neuloží.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowNewCompany(false)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Zrušit</button><button disabled={savingCompany} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{savingCompany ? 'Zakládám…' : 'Založit a pozvat vlastníka'}</button></div></form></div>}
    {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="support-title" className="w-full max-w-lg rounded-3xl border border-slate-700 bg-[#0C111D] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-blue-300">Auditovaný přístup</p><h2 id="support-title" className="mt-2 text-xl font-black text-white">Přihlásit jako podpora</h2><p className="mt-2 text-sm text-slate-400">{selected.name} · dočasný klientský workspace</p></div><button aria-label="Zavřít" onClick={() => setSelected(null)} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button></div><label className="mt-6 block text-sm font-semibold text-slate-300">Důvod podpory<textarea autoFocus maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-28 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label><div className="mt-6 flex justify-end gap-3"><button onClick={() => setSelected(null)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300">Zrušit</button><button disabled={creatingSupport || reason.trim().length < 3} onClick={startSupport} className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40">{creatingSupport ? 'Vytvářím…' : 'Spustit podporu'}</button></div></section></div>}
  </div>;
};
