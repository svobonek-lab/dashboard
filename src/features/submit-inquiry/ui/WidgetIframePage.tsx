import React, { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Mail, MapPin, Phone, User } from 'lucide-react';
import { isSupabaseConfigured, publicSupabase } from '../../../shared/api/supabase';
import { resolvePublicTenantKey } from '../model/publicIntakeRoute';
import { requestImmediateOutboxDispatch } from '../../../shared/api/emailNotifications';

const PROJECT_TYPES = ['Rekonstrukce', 'Střecha a krov', 'Novostavba', 'Pergola nebo terasa', 'Jiná stavební práce'];

type Company = { id: string; name: string; primary_color: string; logo_url?: string };

export const WidgetIframePage: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [requestKey] = useState(() => `web_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', projectType: '', address: '', budget: '', description: '', website: '', consent: false
  });

  useEffect(() => {
    const loadCompany = async () => {
      const tenantKey = resolvePublicTenantKey(window.location.search, window.location.pathname);
      if (!tenantKey) {
        setLoading(false);
        return;
      }
      try {
        if (isSupabaseConfigured && publicSupabase) {
          const { data, error: loadError } = await publicSupabase.rpc('app_get_public_company', { p_public_key: tenantKey });
          if (!loadError && data?.public_key && data.active !== false) {
            setCompany({ id: data.public_key, name: data.name || 'Stavební firma', primary_color: data.color || '#0A84FF', logo_url: data.logo_url || '' });
          }
        }
      } catch (loadError) {
        console.warn('Public company could not be loaded', loadError);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, []);

  const update = (field: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!company || !form.name.trim() || !form.phone.trim() || !form.projectType || !form.consent) {
      setError('Poptávka se neodeslala. Doplňte jméno, telefon, typ práce a potvrďte souhlas.');
      return;
    }
    if (form.name.trim().length > 120 || form.phone.trim().length > 30 || form.email.trim().length > 254 || form.address.trim().length > 250 || form.description.trim().length > 3500) {
      setError('Poptávka se neodeslala. Zkraťte příliš dlouhé údaje a zkuste to znovu.');
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Poptávka se neodeslala. Opravte e-mail a zkuste to znovu.');
      return;
    }

    setError('');
    setSubmitting(true);
    const description = [
      form.address && `Adresa: ${form.address.trim()}`,
      form.description && `Popis: ${form.description.trim()}`,
      'Souhlas se zpracováním kontaktních údajů: ano'
    ].filter(Boolean).join('\n');

    try {
      if (isSupabaseConfigured && publicSupabase) {
        const response = await fetch('/api/public-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_key: company.id,
            request_key: requestKey,
            customer: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            title: form.projectType,
            description,
            value: Number(form.budget.replace(/\D/g, '')) || 0,
            website: form.website,
          }),
        });
        if (!response.ok) throw new Error(`Public intake failed (${response.status})`);
        await requestImmediateOutboxDispatch();
      } else {
        throw new Error('Public intake is not configured');
      }
      setSubmitted(true);
    } catch (submitError) {
      console.error('Public lead submission failed', submitError);
      setError('Poptávku se nepodařilo odeslat. Zkuste to znovu nebo kontaktujte firmu telefonicky.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-label="Načítání formuláře" /></main>;

  if (!company) return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-5">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-9 w-9 text-amber-500" />
        <h1 className="mt-4 text-xl font-semibold text-slate-950">Formulář není dostupný</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Odkaz není platný nebo firma příjem poptávek zatím neaktivovala.</p>
      </section>
    </main>
  );

  const color = company.primary_color || '#0A84FF';

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-5 flex items-center gap-3 px-1">
          {company.logo_url ? <img src={company.logo_url} alt="" className="h-11 w-11 rounded-2xl border border-white bg-white object-contain p-1 shadow-sm" /> : <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm" style={{ backgroundColor: color }}>{company.name.slice(0, 2).toUpperCase()}</span>}
          <div><p className="text-xs font-semibold text-slate-400">Nezávazná poptávka</p><h1 className="text-lg font-semibold tracking-tight text-slate-950">{company.name}</h1></div>
        </header>

        {submitted ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50"><CheckCircle2 className="h-7 w-7 text-emerald-600" /></span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">Poptávka byla přijata</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{company.name} má vaše údaje bezpečně uložené a může vás kontaktovat na zadaném telefonu nebo e-mailu.</p>
          </section>
        ) : (
          <form onSubmit={submit} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Co pro vás můžeme postavit?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Stačí základní údaje. Firma se ozve a domluví s vámi další postup.</p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field icon={User} label="Jméno a příjmení" required><input value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" maxLength={120} /></Field>
              <Field icon={Phone} label="Telefon" required><input value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" inputMode="tel" maxLength={30} /></Field>
              <Field icon={Mail} label="E-mail"><input value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" inputMode="email" maxLength={254} /></Field>
              <Field label="Typ práce" required><select value={form.projectType} onChange={(e) => update('projectType', e.target.value)}><option value="">Vyberte typ práce</option>{PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
              <Field icon={MapPin} label="Místo realizace" wide><input value={form.address} onChange={(e) => update('address', e.target.value)} autoComplete="street-address" placeholder="Město nebo adresa" maxLength={250} /></Field>
              <Field label="Orientační rozpočet" wide><input value={form.budget} onChange={(e) => update('budget', e.target.value)} inputMode="numeric" placeholder="Např. 250 000 Kč" /></Field>
              <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-700">Stručný popis</span><textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} maxLength={3500} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="Rozměry, stav objektu nebo další požadavky" /></label>
            </div>

            <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><label htmlFor="public-intake-website">Nechte toto pole prázdné</label><input id="public-intake-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website', e.target.value)} /></div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-600"><input type="checkbox" checked={form.consent} onChange={(e) => update('consent', e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" /><span>Souhlasím, aby mě {company.name} kontaktovala kvůli této poptávce. Údaje budou použity pouze pro její vyřízení.</span></label>

            {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
            <button type="submit" disabled={submitting} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60" style={{ backgroundColor: color }}>{submitting ? 'Odesílám poptávku…' : 'Odeslat poptávku'}</button>
            <p className="mt-3 text-center text-[11px] text-slate-400">Formulář bezpečně zajišťuje StavbaFlow.</p>
          </form>
        )}
      </div>
    </main>
  );
};

const Field: React.FC<{ label: string; required?: boolean; wide?: boolean; icon?: React.ComponentType<{ className?: string }>; children: React.ReactElement<any> }> = ({ label, required, wide, icon: Icon, children }) => (
  <label className={wide ? 'sm:col-span-2' : ''}>
    <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}{required ? ' *' : ''}</span>
    <span className="relative block">{Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}{React.cloneElement(children, { className: `w-full rounded-xl border border-slate-200 bg-white py-2.5 ${Icon ? 'pl-9' : 'pl-3'} pr-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50` })}</span>
  </label>
);
