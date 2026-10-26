import React, { useEffect, useRef, useState } from 'react';
import { Bell, Building2, Check, CreditCard, Image as ImageIcon, Mail, MapPin, Phone, Save, Upload } from 'lucide-react';
import { useOrganization } from '@/entities/session';
import { canManageCompany } from '@/shared/model/permissions';
import { startBillingPortal } from '@/features/manage-billing';
import { crmRepo } from '@/shared/api/crm-repository';
import { CompanyDataExport } from '@/features/export-company-data';

export const OwnerSettingsPage: React.FC = () => {
  const { dbUser, currentOrg, updateBrandingAdmin } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: '', color: '#2563eb', logo: '', email: '', phone: '', address: '', emailNotifications: true });
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [state, setState] = useState<{ kind: 'idle' | 'saving' | 'success' | 'error'; message?: string }>({ kind: 'idle' });
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [byodbMode, setByodbMode] = useState(false);
  const [storageModeLoading, setStorageModeLoading] = useState(true);
  const billingReturn = new URLSearchParams(window.location.search).get('billing');

  useEffect(() => {
    setForm({
      name: currentOrg?.name || '', color: currentOrg?.primary_color || '#2563eb', logo: currentOrg?.logo_url || '',
      email: currentOrg?.email || '', phone: currentOrg?.phone || '', address: currentOrg?.address || '', emailNotifications: currentOrg?.email_notifications !== false,
    });
  }, [currentOrg?.id, currentOrg?.name, currentOrg?.primary_color, currentOrg?.logo_url, currentOrg?.email, currentOrg?.phone, currentOrg?.address, currentOrg?.email_notifications]);

  useEffect(() => {
    let active = true;
    if (!currentOrg?.id) { setByodbMode(false); setStorageModeLoading(false); return; }
    setStorageModeLoading(true);
    void crmRepo.repository(currentOrg.id).then(async mode => {
      if (!active) return;
      setByodbMode(mode === 'byodb');
      if (mode === 'byodb') {
        const branding = await crmRepo.byodb.getBranding(currentOrg.id);
        if (active) setForm(previous => ({ ...previous, name: branding.name || '', email: branding.email || '', phone: branding.phone || '', address: branding.address || '' }));
      }
      if (active) setStorageModeLoading(false);
    }).catch(() => { if (active) setState({ kind: 'error', message: 'Režim databáze firmy se nepodařilo ověřit. Uložení zůstává vypnuté.' }); });
    return () => { active = false; };
  }, [currentOrg?.id]);

  useEffect(() => {
    fetch('/api/email-notification-status')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('status unavailable')))
      .then((payload) => setProviderConfigured(payload.providerConfigured === true))
      .catch(() => setProviderConfigured(false));
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageCompany(dbUser?.role) || !currentOrg?.id) { setState({ kind: 'error', message: 'Firemní profil může upravit pouze majitel firmy.' }); return; }
    setState({ kind: 'saving' });
    try {
      await updateBrandingAdmin(currentOrg.id, form.name.trim(), form.color, form.logo, { email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(), email_notifications: form.emailNotifications });
      setState({ kind: 'success', message: 'Firemní profil byl uložen.' });
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Firemní profil se nepodařilo uložit.' });
    }
  };

  const readLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) { setState({ kind: 'error', message: 'Logo musí být obrázek do 1 MB.' }); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, logo: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50';

  const openBillingPortal = async () => {
    setBillingBusy(true); setBillingError('');
    try { await startBillingPortal(); }
    catch (error) { setBillingError(error instanceof Error ? error.message : 'Správu plateb se nepodařilo otevřít.'); setBillingBusy(false); }
  };

  return (
    <div className="workspace-page mx-auto max-w-4xl">
      <header className="workspace-page-header"><div><p className="workspace-kicker">Nastavení firmy</p><h1 className="workspace-title">Firemní profil</h1><p className="workspace-subtitle">Údaje používané v pracovním prostoru a při komunikaci se zákazníkem.</p></div></header>
      {state.kind === 'success' && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><Check className="h-4 w-4" />{state.message}</div>}
      {state.kind === 'error' && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.message}</div>}
      {billingReturn === 'success' && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Platba byla přijata. Aktivace předplatného se ověřuje přes Stripe.</div>}
      {billingReturn === 'canceled' && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">Platba byla zrušena a tarif se nezměnil.</div>}
      {billingReturn === 'portal_return' && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">Vrátili jste se ze zabezpečené správy plateb.</div>}
      {byodbMode && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Firemní údaje se načítají ze zdrojové databáze a její schválené mapy. Název a kontakty ukládáme tam; barvu, logo a e-mailová upozornění lze upravovat v režimu Managed Cloud.</div>}
      <section className="workspace-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-700"><CreditCard className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold text-slate-950">Předplatné a fakturace</h2><p className="mt-1 text-xs leading-5 text-slate-500">Stav: {currentOrg?.subscription_status || 'nenastaveno'} · Tarif: {currentOrg?.plan || 'nenastaveno'}</p>{billingError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{billingError}</p>}</div></div>
        <button type="button" disabled={billingBusy} onClick={openBillingPortal} className="workspace-secondary-action min-h-11 px-4 text-sm font-semibold disabled:opacity-60">{billingBusy ? 'Otevírám…' : 'Spravovat platbu'}</button>
      </section>
      <form onSubmit={save} className="workspace-panel space-y-7 p-5 sm:p-7">
        <section>
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-950">Identita</h2></div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Název firmy<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} /></label>
            <label className="text-sm font-medium text-slate-700">Hlavní barva<div className="mt-1.5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2"><input type="color" disabled={byodbMode} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent disabled:cursor-not-allowed disabled:opacity-50" /><span className="font-mono text-sm text-slate-600">{form.color}</span></div></label>
          </div>
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-slate-400 shadow-sm">{form.logo ? <img src={form.logo} alt="Náhled loga" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5" />}</span>
            <div><strong className="block text-sm font-semibold text-slate-950">Logo firmy</strong><p className="mt-1 text-xs text-slate-500">PNG, JPG nebo SVG do 1 MB.</p><input ref={fileInputRef} type="file" disabled={byodbMode} accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => readLogo(e.target.files?.[0])} className="hidden" /><button type="button" disabled={byodbMode} onClick={() => fileInputRef.current?.click()} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"><Upload className="h-3.5 w-3.5" />Vybrat logo</button></div>
          </div>
        </section>
        <section className="border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-semibold text-slate-950">E-mailová upozornění</h2></div>
          <label className="mt-4 flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span><strong className="block text-sm font-semibold text-slate-950">Posílat e-mailová upozornění</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Majitel dostane zprávu po nové poptávce a zaměstnanec po přiřazení zakázky.</span></span>
            <input aria-label="Posílat e-mailová upozornění" type="checkbox" disabled={byodbMode} checked={form.emailNotifications} onChange={(event) => setForm({ ...form, emailNotifications: event.target.checked })} className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50" />
          </label>
          {providerConfigured === false && form.emailNotifications && (
            <div role="status" className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">Poskytovatel e-mailů není nakonfigurovaný. Upozornění zůstanou ve frontě jako neodeslané a systém nebude tvrdit, že byla doručena.</div>
          )}
          {providerConfigured === true && <p className="mt-3 text-xs font-medium text-emerald-700">Odesílání e-mailů je připravené.</p>}
        </section>
        <section className="border-t border-slate-100 pt-6">
          <h2 className="text-sm font-semibold text-slate-950">Kontaktní údaje</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">E-mail<div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${fieldClass} pl-10`} /></div></label>
            <label className="text-sm font-medium text-slate-700">Telefon<div className="relative"><Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${fieldClass} pl-10`} /></div></label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">Adresa<div className="relative"><MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${fieldClass} pl-10`} /></div></label>
          </div>
        </section>
        <div className="flex justify-end border-t border-slate-100 pt-6"><button type="submit" disabled={state.kind === 'saving' || storageModeLoading} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm font-semibold disabled:opacity-60"><Save className="h-4 w-4" />{state.kind === 'saving' ? 'Ukládám…' : storageModeLoading ? 'Ověřuji režim…' : 'Uložit profil'}</button></div>
      </form>
      {currentOrg && <CompanyDataExport companyId={currentOrg.id} role={dbUser?.role} />}
    </div>
  );
};
