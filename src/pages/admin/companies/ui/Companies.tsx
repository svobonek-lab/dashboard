import React, { useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, Circle, Copy, CreditCard, LogIn, Mail, Plus, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
import { createPlatformCompany, createPlatformSupportSession, getPlatformPublicFormLink, listPlatformCompanies, resendPlatformOwnerInvite, revokePlatformSupportSession, setPlatformCompanyBillingPlan, type NewPlatformCompany, type PlatformCompany } from '@/features/platform-admin';
import { useRouter } from '@/shared/lib/router';
import { createOwnerLegalConsent } from '@/shared/model/legalConsent';

const SUBSCRIPTIONS: Record<PlatformCompany['subscription_status'], string> = { not_configured: 'Nenastaveno', pilot: 'Pilot', trial: 'Zkušební', active: 'Aktivní', past_due: 'Po splatnosti', canceled: 'Ukončeno' };
const EMPTY_COMPANY: NewPlatformCompany = { name: '', slug: '', ownerName: '', ownerEmail: '', plan: 'pilot', legalConsent: { termsAccepted: false, dpaAccepted: false, acceptedAt: createOwnerLegalConsent().acceptedAt } };

function OnboardingState({ company }: { company: PlatformCompany }) {
  const steps = [
    { done: ['queued', 'sent', 'accepted'].includes(company.invitation_status), label: company.invitation_status === 'queued' ? 'Pozvánka čeká na odeslání' : company.invitation_status === 'review_required' ? 'Pozvánka vyžaduje kontrolu. Ověřte její stav.' : company.invitation_status === 'failed' ? 'Pozvánka se neodeslala. Obnovte ji.' : 'Pozvánka doručena' },
    { done: company.invitation_status === 'accepted', label: 'Pozvánka přijata' },
    { done: Boolean(company.first_lead_at), label: 'První poptávka' },
  ];
  return <div className="space-y-1.5">{steps.map((step) => <span key={step.label} className={`flex items-center gap-1.5 text-xs ${step.done ? 'text-emerald-700' : 'text-slate-600'}`}>{step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}{step.label}</span>)}</div>;
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
  const [planDrafts, setPlanDrafts] = useState<Record<string, 'pilot' | 'starter' | 'growth' | 'pro'>>({});

  const load = () => { setLoading(true); setError(''); listPlatformCompanies().then(setCompanies).catch(() => setError('Seznam firem se nenačetl. Zkuste ho obnovit.')).finally(() => setLoading(false)); };
  useEffect(load, []);
  const visible = useMemo(() => companies.filter((company) => `${company.name} ${company.slug}`.toLowerCase().includes(search.trim().toLowerCase())), [companies, search]);

  const submitCompany = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingCompany(true); setError(''); setNotice('');
    try { await createPlatformCompany(newCompany); setShowNewCompany(false); setNewCompany(EMPTY_COMPANY); setNotice('Firma vytvořena. Pozvánka vlastníka čeká na odeslání.'); load(); }
    catch { setError('Firma se nevytvořila. Zkontrolujte údaje a zkuste to znovu.'); }
    finally { setSavingCompany(false); }
  };

  const resendInvite = async (company: PlatformCompany) => {
    setBusyCompanyId(company.id); setError(''); setNotice('');
    try { await resendPlatformOwnerInvite(company.id); setNotice(`Pozvánka pro ${company.name} obnovena a zařazena k odeslání.`); load(); }
    catch { setError('Pozvánka se neodeslala. Zkontrolujte e-mail a zkuste to znovu.'); }
    finally { setBusyCompanyId(''); }
  };

  const copyFormLink = async (company: PlatformCompany) => {
    setBusyCompanyId(company.id); setError(''); setNotice('');
    try { const link = await getPlatformPublicFormLink(company.id); await navigator.clipboard.writeText(link); setNotice(`Odkaz formuláře pro ${company.name} zkopírován.`); }
    catch { setError('Odkaz se nezkopíroval. Zkuste tlačítko znovu nebo odkaz zkopírujte ručně.'); }
    finally { setBusyCompanyId(''); }
  };

  const saveBillingPlan = async (company: PlatformCompany) => {
    const plan = planDrafts[company.id] || (company.plan === 'not_configured' ? 'pilot' : company.plan);
    setBusyCompanyId(company.id); setError(''); setNotice('');
    try { await setPlatformCompanyBillingPlan(company.id, plan); setNotice(`Tarif firmy ${company.name} nastaven. Aktivaci platby ověřte v přehledu firmy.`); load(); }
    catch { setError('Tarif se nenastavil. Zkontrolujte volbu a zkuste to znovu.'); }
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
    } catch { setError('Relace podpory se nevytvořila. Zkuste to znovu.'); setCreatingSupport(false); }
  };

  return <div className="workspace-page admin-companies">
    <div className="workspace-page-header"><div><p className="workspace-kicker">Provozní adresář</p><h1 className="workspace-title">Zákaznické firmy</h1><p className="workspace-subtitle">Založte firmu, pozvěte vlastníka a sledujte první kroky onboardingu.</p></div><button onClick={() => { setShowNewCompany(true); setError(''); }} className="inline-flex min-h-11 items-center justify-center gap-2 workspace-primary-action px-4 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Založit firmu</button></div>
    <div className="rounded-panel border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Auditovaná správa.</strong> Vytvoření firmy, pozvánky, odkazy na formuláře i vstupy podpory se zapisují do provozního auditu.</div>
    <div className="workspace-panel flex gap-3 p-3"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hledat firmu" className="workspace-search" /></label><button aria-label="Obnovit adresář" onClick={load} className="min-h-11 min-w-11 rounded-control border border-border text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
    {error && <div role="alert" className="flex gap-3 rounded-panel border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><ShieldAlert className="h-5 w-5 shrink-0" />{error}</div>}
    {notice && <div role="status" className="rounded-panel border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    <div data-testid="admin-company-cards" className="grid gap-3 md:hidden">
      {visible.map((company) => <article data-testid="admin-company-card" key={company.id} className="rounded-panel border border-border bg-white p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-blue-500/10 text-blue-700"><Building2 className="h-4 w-4" /></span>
            <div className="min-w-0"><h2 className="break-words text-sm font-bold text-slate-950">{company.name}</h2><p className="mt-1 break-all text-xs text-slate-600">{company.slug}</p></div>
          </div>
          <span className={"shrink-0 rounded-full px-2 py-1 text-[10px] font-bold " + (company.active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-700 text-slate-700')}>{company.active ? 'Aktivní' : 'Pozastavená'}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><p className="mb-2 text-[10px] font-bold text-slate-600">Onboarding</p><OnboardingState company={company} /></div>
          <div><p className="text-[10px] font-bold text-slate-600">Uživatelé</p><p className="mt-1 text-sm font-semibold text-slate-800">{company.member_count}</p></div>
          <div><p className="text-[10px] font-bold text-slate-600">Tarif</p><select aria-label={'Tarif ' + company.name} value={planDrafts[company.id] || (company.plan === 'not_configured' ? 'pilot' : company.plan)} onChange={(event) => setPlanDrafts((current) => ({ ...current, [company.id]: event.target.value as 'pilot' | 'starter' | 'growth' | 'pro' }))} className="mt-1 w-full rounded-control border border-border bg-surface-secondary px-2 py-2 text-xs text-slate-950"><option value="pilot">Pilot</option><option value="starter">Starter</option><option value="growth">Růst</option><option value="pro">Profi</option></select></div>
          <div><p className="text-[10px] font-bold text-slate-600">Stav platby</p><p className="mt-2 break-words text-xs text-slate-700">{SUBSCRIPTIONS[company.subscription_status]}</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button disabled={busyCompanyId === company.id} onClick={() => saveBillingPlan(company)} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-control border border-emerald-200 bg-emerald-50 px-2 py-2 text-center text-xs font-semibold leading-4 text-emerald-800 disabled:opacity-50"><CreditCard className="h-3.5 w-3.5 shrink-0" /><span>Nastavit tarif</span></button>
          <button title="Znovu poslat pozvánku" disabled={busyCompanyId === company.id || ['accepted', 'review_required'].includes(company.invitation_status)} onClick={() => resendInvite(company)} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-control border border-border px-2 py-2 text-center text-xs font-semibold leading-4 text-slate-700 disabled:opacity-50"><Mail className="h-3.5 w-3.5 shrink-0" /><span>Obnovit pozvánku</span></button>
          <button title="Kopírovat odkaz formuláře" disabled={busyCompanyId === company.id} onClick={() => copyFormLink(company)} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-control border border-border px-2 py-2 text-center text-xs font-semibold leading-4 text-slate-700 disabled:opacity-50"><Copy className="h-3.5 w-3.5 shrink-0" /><span>Kopírovat odkaz</span></button>
          <button onClick={() => { setSelected(company); setReason(''); }} className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-center text-xs font-semibold leading-4 text-blue-800"><LogIn className="h-3.5 w-3.5 shrink-0" /><span>Zadat důvod podpory</span></button>
        </div>
      </article>)}
      {!loading && !error && visible.length === 0 && <div className="rounded-panel border border-border bg-white p-6 text-center text-sm text-slate-600"><p>Žádná firma neodpovídá hledání.</p><button type="button" onClick={() => search ? setSearch('') : load()} className="mt-2 font-semibold text-blue-700">{search ? 'Vymazat hledání' : 'Obnovit seznam firem'}</button></div>}
    </div>
    <div data-testid="admin-company-table" className="hidden overflow-hidden rounded-dialog border border-border bg-white md:block"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b border-border bg-surface-secondary text-xs text-slate-600"><tr><th className="px-5 py-4">Firma</th><th className="px-5 py-4">Onboarding</th><th className="px-5 py-4 text-right">Uživatelé</th><th className="px-5 py-4">Plán</th><th className="px-5 py-4">Akce</th></tr></thead><tbody className="divide-y divide-border">{visible.map((company) => <tr key={company.id} className="align-top hover:bg-surface-secondary"><td className="px-5 py-4"><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-control bg-blue-500/10 text-blue-700"><Building2 className="h-4 w-4" /></span><span><strong className="block text-slate-950">{company.name}</strong><small className="text-slate-600">{company.slug}, {company.active ? 'aktivní' : 'pozastavená'}</small></span></span></td><td className="px-5 py-4"><OnboardingState company={company} /></td><td className="px-5 py-4 text-right tabular-nums font-semibold text-slate-700">{company.member_count}</td><td className="px-5 py-4"><span className="block text-xs text-slate-600">{SUBSCRIPTIONS[company.subscription_status]}</span><select aria-label={`Tarif ${company.name}`} value={planDrafts[company.id] || (company.plan === 'not_configured' ? 'pilot' : company.plan)} onChange={(event) => setPlanDrafts((current) => ({ ...current, [company.id]: event.target.value as 'pilot' | 'starter' | 'growth' | 'pro' }))} className="mt-2 rounded-control border border-border bg-surface-secondary px-2 py-1.5 text-xs text-slate-950"><option value="pilot">Pilot</option><option value="starter">Starter</option><option value="growth">Růst</option><option value="pro">Profi</option></select></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2"><button disabled={busyCompanyId === company.id} onClick={() => saveBillingPlan(company)} className="inline-flex items-center gap-1.5 rounded-control border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800 disabled:opacity-40"><CreditCard className="h-3.5 w-3.5" />Nastavit tarif</button><button disabled={busyCompanyId === company.id || ['accepted', 'review_required'].includes(company.invitation_status)} onClick={() => resendInvite(company)} className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"><Mail className="h-3.5 w-3.5" />Obnovit pozvánku</button><button disabled={busyCompanyId === company.id} onClick={() => copyFormLink(company)} className="inline-flex items-center gap-1.5 rounded-control border border-border px-2.5 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"><Copy className="h-3.5 w-3.5" />Kopírovat odkaz formuláře</button><button onClick={() => { setSelected(company); setReason(''); }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-800"><LogIn className="h-3.5 w-3.5" />Zadat důvod podpory</button></div></td></tr>)}</tbody></table></div>{!loading && !error && visible.length === 0 && <div className="p-10 text-center text-sm text-slate-600"><p>Žádná firma neodpovídá hledání.</p><button type="button" onClick={() => search ? setSearch('') : load()} className="mt-2 font-semibold text-blue-700">{search ? 'Vymazat hledání' : 'Obnovit seznam firem'}</button></div>}</div>
    {showNewCompany && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm p-4"><form role="dialog" aria-modal="true" aria-labelledby="new-company-title" data-testid="new-company-modal" onSubmit={submitCompany} className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain w-full max-w-xl rounded-dialog border border-border bg-white p-6 text-text shadow-xl"><div className="flex justify-between"><div><p className="text-xs font-bold text-blue-700">Onboarding pilota</p><h2 id="new-company-title" className="mt-2 text-xl font-black text-slate-950">Nová firma</h2></div><button type="button" aria-label="Zavřít" onClick={() => setShowNewCompany(false)} className="text-slate-600"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Název firmy<input required minLength={2} maxLength={160} value={newCompany.name} onChange={(event) => setNewCompany({ ...newCompany, name: event.target.value })} className="mt-2 min-h-11 w-full rounded-control border border-border bg-surface-secondary px-3 text-text" /></label><label className="text-sm font-semibold text-slate-700">Identifikátor firmy<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="strechy-novak" value={newCompany.slug} onChange={(event) => setNewCompany({ ...newCompany, slug: event.target.value.toLowerCase() })} className="mt-2 w-full rounded-control border border-border bg-surface-secondary p-3 text-slate-950" /></label><label className="text-sm font-semibold text-slate-700">Jméno vlastníka<input required minLength={2} maxLength={160} value={newCompany.ownerName} onChange={(event) => setNewCompany({ ...newCompany, ownerName: event.target.value })} className="mt-2 w-full rounded-control border border-border bg-surface-secondary p-3 text-slate-950" /></label><label className="text-sm font-semibold text-slate-700">E-mail vlastníka<input required type="email" value={newCompany.ownerEmail} onChange={(event) => setNewCompany({ ...newCompany, ownerEmail: event.target.value })} className="mt-2 w-full rounded-control border border-border bg-surface-secondary p-3 text-slate-950" /></label></div><div className="mt-4 space-y-2 rounded-panel border border-border bg-surface-secondary p-4 text-xs leading-5 text-slate-700"><label className="flex items-start gap-2"><input required type="checkbox" checked={newCompany.legalConsent.termsAccepted} onChange={(event) => setNewCompany({ ...newCompany, legalConsent: { ...newCompany.legalConsent, termsAccepted: event.target.checked, acceptedAt: new Date().toISOString() } })} className="mt-0.5" />Souhlasím s Obchodními podmínkami (TOS)</label><label className="flex items-start gap-2"><input required type="checkbox" checked={newCompany.legalConsent.dpaAccepted} onChange={(event) => setNewCompany({ ...newCompany, legalConsent: { ...newCompany.legalConsent, dpaAccepted: event.target.checked, acceptedAt: new Date().toISOString() } })} className="mt-0.5" />Uzavírám Zpracovatelskou smlouvu (DPA) jménem své organizace</label></div><p className="mt-4 text-xs leading-5 text-slate-600">Po potvrzení vznikne pilotní firemní prostor a vlastník dostane jednorázovou pozvánku. Pokud odeslání selže, firma se neuloží.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowNewCompany(false)} className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold text-slate-700">Zrušit</button><button disabled={savingCompany || !newCompany.legalConsent.termsAccepted || !newCompany.legalConsent.dpaAccepted} className="min-h-11 rounded-control workspace-primary-action px-4 text-sm font-semibold text-white disabled:opacity-50">{savingCompany ? 'Zakládám firmu a zvu vlastníka…' : 'Založit a pozvat vlastníka'}</button></div></form></div>}
    {selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section role="dialog" aria-modal="true" aria-labelledby="support-title" data-testid="support-session-modal" className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain w-full max-w-lg rounded-dialog border border-border bg-white p-6 text-text shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-blue-700">Auditovaný přístup</p><h2 id="support-title" className="mt-2 text-xl font-black text-slate-950">Přihlásit jako podpora</h2><p className="mt-2 text-sm text-slate-600">{selected.name}, dočasný klientský workspace</p></div><button aria-label="Zavřít" onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-950"><X className="h-5 w-5" /></button></div><label className="mt-6 block text-sm font-semibold text-slate-700">Důvod podpory<textarea autoFocus maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-28 w-full rounded-panel border border-border bg-surface-secondary p-3 text-sm text-slate-950" /></label><div className="mt-6 flex justify-end gap-3"><button onClick={() => setSelected(null)} className="rounded-control border border-border px-4 py-2 text-sm font-bold text-slate-700">Zrušit</button><button disabled={creatingSupport || reason.trim().length < 3} onClick={startSupport} className="rounded-control workspace-primary-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{creatingSupport ? 'Spouštím podporu…' : 'Spustit podporu'}</button></div></section></div>}
  </div>;
};
