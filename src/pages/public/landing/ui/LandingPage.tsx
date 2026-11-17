import React, { useState } from 'react';
import {
  CheckCircle2,
  DollarSign,
  HardHat,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  FileText,
  Calendar,
  Building2,
  AlertCircle,
  ExternalLink,
  HelpCircle,
  Calculator,
  Download,
  Check,
  X,
  LockKeyhole,
} from 'lucide-react';
import { useRouter } from '@/shared/lib/router';
import { buildSalesContact, getSalesContactMode } from '@/pages/public/landing';
import { getLegalIdentityReadiness } from '../model/legalReadiness';
import { resolveDemoUrl } from '@/shared/lib/demoUrl';
import { buildPublicAppPath } from '@/shared/lib/publicUrls';

const PUBLIC_CONTACT_EMAIL = 'svobonek@gmail.com';
const PUBLIC_CONTACT_ADDRESS = 'Vincence Makovského 4428/11';
const LANDING_ENV = ((import.meta as any).env || {}) as Record<string, unknown>;
const LEGAL_COMPANY_NAME = ((import.meta as any).env?.VITE_COMPANY_NAME || '').trim();
const COMPANY_NAME = LEGAL_COMPANY_NAME || 'StavbaFlow';
const COMPANY_ICO = ((import.meta as any).env?.VITE_COMPANY_ICO || '').trim();
const LEGAL_COMPANY_ADDRESS = ((import.meta as any).env?.VITE_COMPANY_ADDRESS || '').trim();
const COMPANY_ADDRESS = LEGAL_COMPANY_ADDRESS;
const COMPANY_EMAIL = ((import.meta as any).env?.VITE_COMPANY_EMAIL || '').trim() || PUBLIC_CONTACT_EMAIL;
const COMPANY_PHONE = ((import.meta as any).env?.VITE_COMPANY_PHONE || '').trim();
const LEGAL_IDENTITY_READINESS = getLegalIdentityReadiness({
  DEV: LANDING_ENV.DEV,
  VITE_COMPANY_NAME: String(LANDING_ENV.VITE_COMPANY_NAME || ''),
  VITE_COMPANY_ICO: String(LANDING_ENV.VITE_COMPANY_ICO || ''),
  VITE_COMPANY_ADDRESS: String(LANDING_ENV.VITE_COMPANY_ADDRESS || ''),
  VITE_COMPANY_EMAIL: String(LANDING_ENV.VITE_COMPANY_EMAIL || ''),
  VITE_COMPANY_VOP_APPROVED: String(LANDING_ENV.VITE_COMPANY_VOP_APPROVED || ''),
});
const COMPANY_LEGAL_DETAILS_CONFIGURED = LEGAL_IDENTITY_READINESS.ready;
const SALES_CONTACT = getSalesContactMode({
  ...((import.meta as any).env || {}),
  VITE_COMPANY_EMAIL: COMPANY_EMAIL,
});
const DEMO_DESTINATION = resolveDemoUrl(LANDING_ENV, {
  isDevelopment: Boolean(LANDING_ENV.DEV),
  origin: typeof window === 'undefined' ? '' : window.location.origin,
  allowRelative: String(LANDING_ENV.VITE_DEPLOYMENT_SURFACE || '').toLowerCase() !== 'landing'
    && !(typeof window !== 'undefined' && /^(jobflow-pro|stavbaflow-landing)/.test(window.location.hostname.toLowerCase())),
});
const IS_SALES_SURFACE = String(LANDING_ENV.VITE_DEPLOYMENT_SURFACE || '').toLowerCase() === 'landing'
  || (typeof window !== 'undefined' && /^(jobflow-pro|stavbaflow-landing)/.test(window.location.hostname.toLowerCase()));
const START_REGISTRATION_URL = buildPublicAppPath(LANDING_ENV.PUBLIC_APP_URL, '/register-paid?plan=starter', Boolean(LANDING_ENV.DEV));
const GROWTH_REGISTRATION_URL = buildPublicAppPath(LANDING_ENV.PUBLIC_APP_URL, '/register-paid?plan=growth', Boolean(LANDING_ENV.DEV));

export const LandingPage: React.FC = () => {
  const { navigate } = useRouter();

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingName, setBookingName] = useState('');
  const [bookingCompany, setBookingCompany] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingDate, setBookingDate] = useState('Pondělí 10:00');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState<'vop' | 'gdpr' | 'dpa' | null>(null);

  // ROI Calculator State (Page 13 of Audit)
  const [monthlyLeads, setMonthlyLeads] = useState(16);
  const [quotedRate, setQuotedRate] = useState(60); // %
  const [winRate, setWinRate] = useState(35); // %
  const [avgMargin, setAvgMargin] = useState(98000); // Kč
  const [adminHoursWeekly, setAdminHoursWeekly] = useState(8); // h

  // Calculations
  const calculatedQuotes = Math.round(monthlyLeads * (quotedRate / 100));
  const wonPerQuarter = Math.round((calculatedQuotes * 3) * (winRate / 100));
  const additionalWonQuarter = Math.round(wonPerQuarter * 0.2);
  const additionalMarginQuarter = additionalWonQuarter * avgMargin;
  const starterQuarterCost = 1990 * 3;
  const roiMultiplier = (additionalMarginQuarter / starterQuarterCost).toFixed(1);
  const adminHoursSavedQuarter = Math.round(adminHoursWeekly * 12 * 0.6); // 60% time saved on paperwork

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    // Validation: name min. 2 chars, phone min. 5 chars
    if (bookingName.trim().length < 2) {
      setBookingError('Zadejte prosím platné jméno (minimálně 2 znaky).');
      return;
    }
    if (bookingPhone.trim().length < 5) {
      setBookingError('Zadejte prosím platné telefonní číslo (minimálně 5 znaků).');
      return;
    }
    if (!bookingEmail.includes('@')) {
      setBookingError('Zadejte prosím platný e-mail.');
      return;
    }

    setIsBookingLoading(true);
    try {
      if (SALES_CONTACT.mode === 'booking') {
        window.location.assign(SALES_CONTACT.target);
        return;
      }

      if (SALES_CONTACT.mode === 'email') {
        const mailto = buildSalesContact(SALES_CONTACT.target, {
          name: bookingName,
          company: bookingCompany,
          phone: bookingPhone,
          email: bookingEmail,
          preferredTime: bookingDate
        });
        setBookingSuccess(true);
        window.location.assign(mailto);
        return;
      }

      setBookingError('Obchodní kontakt zatím není nakonfigurovaný. Použijte prosím živé demo a vraťte se později.');
    } catch (err) {
      console.error('Sales contact handoff failed:', err);
      setBookingError('Kontaktní cestu se nepodařilo otevřít. Zkuste to prosím znovu.');
    } finally {
      setIsBookingLoading(false);
    }
  };

  return (
    <div className="public-landing sf-sales workspace-shell min-h-screen bg-[#f3f5f8] text-slate-900 font-sans selection:bg-blue-100">

      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white font-black text-base flex items-center justify-center shadow-xs">
              SF
            </div>
            <div>
              <span className="text-base font-black text-slate-900 tracking-tight">StavbaFlow</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-semibold text-slate-700">
            <a href="#jak-to-funguje" className="hover:text-blue-600 transition-colors">Jak to funguje</a>
            <a href="#kalkulacka" className="hover:text-blue-600 transition-colors">Spočítat přínos</a>
            <a href="#cenik" className="hover:text-blue-600 transition-colors">Ceník</a>
          </nav>

          <div data-testid="landing-header-actions" className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/login')}
              aria-label="Přihlásit se"
              className="min-h-11 min-w-11 px-2 sm:px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              <span className="hidden sm:inline">Přihlásit se</span>
              <LockKeyhole aria-hidden="true" className="mx-auto h-4 w-4 sm:hidden" />
            </button>
            <button
              onClick={() => setIsBookingOpen(true)}
              aria-label="Domluvit ukázku StavbaFlow"
              className="min-h-11 min-w-11 px-4 max-[359px]:px-2 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all"
            >
              <span className="max-[359px]:hidden">Domluvit ukázku</span>
              <Calendar aria-hidden="true" className="mx-auto hidden h-4 w-4 max-[359px]:block" />
            </button>
          </div>
        </div>
      </header>

      {LEGAL_IDENTITY_READINESS.showDevelopmentWarning && (
        <aside role="status" data-testid="legal-identity-development-warning" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950">
          Vývojová kontrola: doplňte {LEGAL_IDENTITY_READINESS.missing.join(', ')} před ostrým nasazením. Veřejná kontaktní adresa se za právní adresu nepovažuje.
        </aside>
      )}


      <section className="sf-sales-hero">
        <div className="sf-sales-intro">
          <p className="sf-sales-audience"><HardHat size={18} aria-hidden="true" /> Pro stavební firmy a řemeslné týmy</p>
          <h1>Na stavbě máte dost práce.<br />Mějte jasno i v zakázkách.</h1>
          <p>Poptávky, lidé a rozpracované zakázky na jednom místě. Od prvního telefonu po dokončenou práci víte, kdo má co na starosti.</p>
          <div className="sf-sales-actions">
            <button onClick={() => setIsBookingOpen(true)}>Prohlédnout s námi</button>
            {DEMO_DESTINATION.url && <a href={DEMO_DESTINATION.url}>Vyzkoušet ukázkovou firmu</a>}
          </div>
          <span className="sf-sales-note">Pro majitele v kanceláři i tým v terénu.</span>
        </div>
        <div className="sf-product-stage">
          <div className="sf-product-window" aria-label="Ukázka aplikace se syntetickými zakázkami">
            <aside className="sf-product-nav" aria-hidden="true"><strong>SF <span>StavbaFlow</span></strong><span className="sf-preview-selected">Přehled firmy</span><span>Poptávky</span><span>Zakázky v realizaci</span><span>Tým</span><span>Nastavení</span><small>Ukázková firma</small></aside>
            <div className="sf-product-content">
              <div className="sf-product-heading"><div><small>Ukázková data</small><h2>Práce pod kontrolou.</h2></div><HardHat aria-hidden="true" /></div>
              <div className="sf-preview-metrics"><div><small>Nové poptávky</small><strong>2</strong></div><div><small>V realizaci</small><strong>1</strong></div><div><small>Celkem zakázek</small><strong>4</strong></div></div>
              <div className="sf-preview-table-title">Poptávky a zakázky <span>Stav práce</span></div>
              {[
                ['Rekonstrukce rodinného domu', 'Brno, Novákovi', 'V realizaci'],
                ['Nová střecha na chalupě', 'Tišnov, Dvořákovi', 'Nová poptávka'],
                ['Zateplení fasády', 'Kuřim, Svoboda', 'Nabídka'],
                ['Dláždění příjezdové cesty', 'Brno, Černý', 'Nová poptávka'],
              ].map(([title, place, status]) => <div className="sf-preview-job" key={title}><span><strong>{title}</strong><small>{place}</small></span><span className="landing-preview-status" data-status={status}>{status}</span></div>)}
            </div>
          </div>
        </div>
      </section>
      <div className="sf-product-promise"><span><Check size={17} /> Poptávky přehledně</span><span><Users size={17} /> Odpovědný člověk u zakázky</span><span><ShieldCheck size={17} /> Vlastní firemní prostor</span></div>

      <section id="jak-to-funguje" className="scroll-mt-20 border-y border-slate-200 bg-white">
        <div id="problemy" className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Jak firma zpracuje poptávku</h2>
            <p className="mt-3 max-w-sm text-slate-600">Scénář pilotu ukazuje cestu od prvního kontaktu po změnu stavu zakázky. Nasazení ověřujeme před zákaznickými daty.</p>
          </div>
          <ol className="divide-y divide-slate-200 border-y border-slate-200">
            {[
              ['Zákazník odešle poptávku', 'Formulář na webu firmy založí záznam v jejím přehledu.'],
              ['Majitel ji přidělí', 'Zkontroluje údaje a vybere odpovědného pracovníka.'],
              ['Pracovník aktualizuje stav', 'Vidí přidělené zakázky. Změny se zapíšou do historie.'],
            ].map(([title, description], index) => (
              <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 py-4">
                <span aria-hidden="true" className="text-sm font-semibold tabular-nums text-blue-700">{index + 1}.</span>
                <div><h3 className="font-semibold text-slate-950">{title}</h3><p className="mt-1 text-slate-600">{description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. User-Driven ROI Calculator (Audit Page 13) */}
      <section id="kalkulacka" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-black text-blue-600 flex items-center justify-center gap-1.5">
              <Calculator className="w-4 h-4" />
              Modelová kalkulačka pro vaši firmu
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Odhadněte přínos zakázek podle vlastních čísel
            </h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">
              Výsledek je orientační scénář založený na vámi zadaných předpokladech. Není příslibem budoucího zisku ani úspory.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders (7 cols) */}
            <div className="lg:col-span-7 space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-200">

              {/* Slider 1: Leads */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold text-slate-800">
                  <span>Kolik poptávek dostáváte měsíčně?</span>
                  <span className="text-blue-600 tabular-nums text-sm">{monthlyLeads} poptávek</span>
                </div>
                <input
                  type="range"
                  aria-label="Počet měsíčních poptávek"
                  min="5"
                  max="60"
                  value={monthlyLeads}
                  onChange={e => setMonthlyLeads(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: Quoted % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold text-slate-800">
                  <span>Kolik z nich dostane cenovou nabídku?</span>
                  <span className="text-blue-600 tabular-nums text-sm">{quotedRate} % ({calculatedQuotes} nabídek)</span>
                </div>
                <input
                  type="range"
                  aria-label="Podíl poptávek s nabídkou"
                  min="20"
                  max="100"
                  value={quotedRate}
                  onChange={e => setQuotedRate(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 3: Win rate % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold text-slate-800">
                  <span>Kolik odeslaných nabídek reálně vyhrajete?</span>
                  <span className="text-blue-600 tabular-nums text-sm">{winRate} %</span>
                </div>
                <input
                  type="range"
                  aria-label="Podíl získaných nabídek"
                  min="10"
                  max="70"
                  value={winRate}
                  onChange={e => setWinRate(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 4: Avg Gross Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold text-slate-800">
                  <span>Průměrná hrubá marže jedné zakázky?</span>
                  <span className="text-blue-600 tabular-nums text-sm">{avgMargin.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <input
                  type="range"
                  aria-label="Průměrná marže zakázky v Kč"
                  min="30000"
                  max="300000"
                  step="1000"
                  value={avgMargin}
                  onChange={e => setAvgMargin(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 5: Admin Hours Weekly */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold text-slate-800">
                  <span>Kolik hodin týdně tráví kancelář přepisováním?</span>
                  <span className="text-blue-600 tabular-nums text-sm">{adminHoursWeekly} h / týdně</span>
                </div>
                <input
                  type="range"
                  aria-label="Hodiny administrativy týdně"
                  min="2"
                  max="30"
                  value={adminHoursWeekly}
                  onChange={e => setAdminHoursWeekly(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

            </div>

            {/* Results Output Box (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900 text-white p-6 rounded-3xl space-y-5 shadow-xl">
              <div>
                  <span className="text-xs font-semibold text-emerald-300">
                  Modelový kvartální přínos (3 měsíce)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                  +{additionalMarginQuarter.toLocaleString('cs-CZ')} Kč
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  Počet zakázek navíc v tomto scénáři: {additionalWonQuarter}
                </p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-800 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Modelovaná úspora času:</span>
                  <strong className="text-white">{adminHoursSavedQuarter} hodin / kvartál</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tarif Start za 3 měsíce:</span>
                  <strong className="text-slate-300">{starterQuarterCost.toLocaleString('cs-CZ')} Kč (bez DPH)</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                  <span>Modelová marže vůči ceně tarifu:</span>
                  <span>{roiMultiplier}×</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 text-sm text-slate-200 leading-relaxed">
                Ilustrativní výpočet s orientačními hodnotami. Předpokládá o 20 % více získaných zakázek a o 60 % méně času na administrativu.
              </div>

              <button
                onClick={() => setIsBookingOpen(true)}
                className="w-full min-h-12 px-4 py-3 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md"
              >
                Ověřit výpočet na osobní ukázce (20 min)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Monthly plans */}
      <section id="cenik" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_2fr] lg:items-end">
          <div>
            <p className="text-sm font-bold text-blue-700">Tarify StavbaFlow</p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Tarif podle velikosti vašeho týmu.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 lg:justify-self-end">
            Měsíční ceny jsou bez DPH. Vyberte kapacitu podle počtu zaměstnanců.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <article className="flex min-h-[340px] flex-col border-t-4 border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950"><Building2 aria-hidden="true" className="h-5 w-5 text-blue-700" />Start</h3>
            <p className="mt-1 text-sm text-slate-600">Pro menší tým</p>
            <p className="mt-7 text-4xl font-black tracking-tight text-slate-950">1 990 Kč</p>
            <p className="mt-1 text-sm text-slate-500">měsíčně bez&nbsp;DPH</p>
            <p className="mt-6 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-800">Až 5 zaměstnanců</p>
            {IS_SALES_SURFACE ? <button onClick={() => setIsBookingOpen(true)} className="mt-auto min-h-12 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Domluvit tarif Start</button> : <a href={START_REGISTRATION_URL} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Pokračovat s tarifem Start</a>}
          </article>

          <article className="flex min-h-[340px] flex-col border-t-4 border-blue-600 bg-blue-50/60 p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950"><Users aria-hidden="true" className="h-5 w-5 text-blue-700" />Růst</h3>
            <p className="mt-1 text-sm text-slate-600">Pro rostoucí firmu</p>
            <p className="mt-7 text-4xl font-black tracking-tight text-slate-950">2 990 Kč</p>
            <p className="mt-1 text-sm text-slate-500">měsíčně bez&nbsp;DPH</p>
            <p className="mt-6 border-t border-blue-200 pt-4 text-sm font-semibold text-slate-800">Až 15 zaměstnanců</p>
            {IS_SALES_SURFACE ? <button onClick={() => setIsBookingOpen(true)} className="mt-auto min-h-12 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Domluvit tarif Růst</button> : <a href={GROWTH_REGISTRATION_URL} className="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Pokračovat s tarifem Růst</a>}
          </article>

          <article className="flex min-h-[340px] flex-col border-t-4 border-slate-700 bg-slate-900 p-6 text-white">
            <h3 className="flex items-center gap-2 text-base font-extrabold"><HardHat aria-hidden="true" className="h-5 w-5 text-blue-300" />Profi</h3>
            <p className="mt-1 text-sm text-slate-300">Pro větší provoz</p>
            <p className="mt-7 text-4xl font-black tracking-tight">4 990 Kč</p>
            <p className="mt-1 text-sm text-slate-300">měsíčně bez&nbsp;DPH</p>
            <p className="mt-6 border-t border-slate-700 pt-4 text-sm font-semibold">Neomezený počet zaměstnanců</p>
            <p className="mt-5 text-sm leading-6 text-slate-300">Přímý databázový konektor připravujeme pro únor&nbsp;2027.</p>
            <p className="mt-auto pt-6 text-sm font-semibold text-slate-300">Profi zatím nelze objednat.</p>
          </article>
        </div>

        <p className="mt-8 border-l-2 border-blue-600 pl-4 text-sm leading-6 text-slate-600">
          <strong className="text-slate-900">Founding Pilot:</strong> jednorázový onboardingový poplatek plus první měsíc. Cena potvrzena při nabídce.
        </p>
        <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-500">
          <strong>SCÉNÁŘ PILOTU — Plánovaný rozsah scénáře:</strong> Plánované funkce zahrnují založení firmy, přihlášení majitele, pozvání zaměstnanců, webový formulář a kontrolovaný CSV import. Před zákaznickými daty je třeba dokončit živou přejímku.
        </p>
        <details className="mt-5 max-w-4xl text-sm text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-800">Mimo první pilot</summary>
          <p className="mt-2">Tyto části zatím nejsou součástí obchodního slibu:</p>
          <ul className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
            <li>Kalendář — není součástí prvního pilotu</li>
            <li>Analytika — není součástí prvního pilotu</li>
            <li>Cenové nabídky — nejsou součástí prvního pilotu</li>
            <li>Dokumenty a protokoly — nejsou součástí prvního pilotu</li>
            <li>Komunikační centrum — není součástí prvního pilotu</li>
            <li>Klientský portál — není součástí prvního pilotu</li>
            <li>Automatické follow-upy — nejsou součástí prvního pilotu</li>
            <li>Přímé SQL/ERP propojení, obousměrná synchronizace a účetní exporty — nejsou součástí prvního pilotu</li>
          </ul>
        </details>
      </section>

      {/* 7. FAQ Section (Audit Page 14) */}
      <section id="faq" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-1">
            <span className="text-[13px] font-semibold text-slate-600">Časté otázky</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Časté otázky k pilotu StavbaFlow</h2>
          </div>

          <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="flex items-start gap-2 font-black text-slate-900 text-sm"><HelpCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /><span>Jak dostaneme do systému současná data?</span></h4>
              <p className="text-slate-600 leading-relaxed">
                Scénář pilotu počítá s kontrolovaným CSV importem. Před potvrzením je potřeba ověřit mapování, chyby i opakovaný běh. V režimu Managed Cloud se data neukládají do původní firemní databáze.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="flex items-start gap-2 font-black text-slate-900 text-sm"><HelpCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /><span>Co zaměstnanec po přihlášení uvidí?</span></h4>
              <p className="text-slate-600 leading-relaxed">
                Přejímka ověřuje, že zaměstnanec vidí jen zakázky přiřazené jeho účtu a databázová pravidla mu nedovolí měnit údaje firmy ani cizí zakázky.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="flex items-start gap-2 font-black text-slate-900 text-sm"><HelpCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /><span>Je systém připravený na přímé propojení s naší SQL databází?</span></h4>
              <p className="text-slate-600 leading-relaxed">
                V prvním pilotu ne. Začínáme bezpečným CSV importem bez zápisu zpět. Přímé propojení se nacení a ověří samostatně až po úspěšném pilotu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-12 bg-slate-900 text-white border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white font-bold flex items-center justify-center text-xs">
                SC
              </div>
              <span className="font-bold">StavbaFlow © 2026</span>
              <span className="text-slate-500">· Operační systém pro české stavební firmy</span>
            </div>
            <div className="flex flex-wrap gap-4 text-slate-400">
              <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Přihlášení</button>
              <button onClick={() => DEMO_DESTINATION.url && window.location.assign(DEMO_DESTINATION.url)} disabled={!DEMO_DESTINATION.url} title={DEMO_DESTINATION.error || 'Otevřít skutečné demo StavbaFlow'} className="hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50">Interaktivní demo</button>
              <button onClick={() => setIsBookingOpen(true)} className="hover:text-white transition-colors">Osobní ukázka (20 min)</button>
              <button onClick={() => setActiveLegalModal('vop')} className="hover:text-white transition-colors">VOP</button>
              <button onClick={() => setActiveLegalModal('gdpr')} className="hover:text-white transition-colors">GDPR & Soukromí</button>
              <button onClick={() => setActiveLegalModal('dpa')} className="hover:text-white transition-colors">Zpracovatelská smlouva (DPA)</button>
            </div>
          </div>
          {!COMPANY_LEGAL_DETAILS_CONFIGURED && (
            <section data-testid="legal-identity-placeholder" role="status" className="rounded-xl border border-amber-700/50 bg-amber-950/40 px-4 py-3 text-[11px] leading-5 text-amber-100">
              <strong className="block text-xs">Právní identita provozovatele není dokončená.</strong>
              <span>IČO: {COMPANY_ICO || 'nedoplněno'}, Právní adresa: {LEGAL_COMPANY_ADDRESS || 'nedoplněna'}, VOP: {String(LANDING_ENV.VITE_COMPANY_VOP_APPROVED || '').toLowerCase() === 'true' ? 'schválené' : 'připravit a schválit'}.</span>
              <span className="block">Údaje doplní provozovatel před uzavřením smlouvy a ostrým spuštěním.</span>
            </section>
          )}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>
              <span>
                {COMPANY_LEGAL_DETAILS_CONFIGURED
                  ? [COMPANY_NAME, `IČO: ${COMPANY_ICO}`, LEGAL_COMPANY_ADDRESS].join(', ')
                  : COMPANY_NAME}
              </span>
            </div>
            <div>
              <a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-white transition-colors">Kontakt: {COMPANY_EMAIL}</a>
              <span className="block">Veřejná kontaktní adresa: {PUBLIC_CONTACT_ADDRESS}</span>
              {COMPANY_PHONE && <span>, Tel: {COMPANY_PHONE}</span>}
            </div>
          </div>
        </div>
      </footer>

      {/* Poznámka pro správce: Před ostrým provozem nechte texty zkontrolovat právníkem */}
      {/* Legal Document Modal */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4 relative text-slate-800 text-xs leading-relaxed">
            <button
              onClick={() => setActiveLegalModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {!COMPANY_LEGAL_DETAILS_CONFIGURED ? (
              <div className="space-y-3">
                <h3 className="text-base font-black text-slate-900">Právní dokumenty připravujeme</h3>
                <p className="text-slate-600 leading-relaxed">
                  Finální právní identita provozovatele, IČO, právní adresa a schválené VOP se doplní před podpisem smlouvy a ostrým spuštěním.
                </p>
                <p className="text-slate-500 text-[11px]">
                  Pro obchodní ukázku napište na {COMPANY_EMAIL}. Dokumenty se nezobrazují jako hotové, dokud neproběhne právní kontrola a doplnění identifikačních údajů.
                </p>
              </div>
            ) : (
              <>
            {activeLegalModal === 'vop' && (
              <div className="space-y-3">
                <h3 className="text-base font-black text-slate-900">Všeobecné obchodní podmínky (VOP)</h3>
                <p className="text-slate-500 text-[11px]">Informační přehled podmínek užívání služby</p>
                <div className="space-y-2 text-slate-700">
                  <p><strong>1. Úvodní ustanovení</strong>: Tyto podmínky upravují poskytování SaaS platformy zákazníkům podnikajícím ve stavebnictví provozovatelem {COMPANY_NAME}{COMPANY_ICO ? `, IČO: ${COMPANY_ICO}` : ''}, se sídlem {COMPANY_ADDRESS}.</p>
                  <p><strong>2. Pilotní program a poskytování služby</strong>: V rámci pilotního nasazení a předplatného je služba poskytována za účelem digitalizace a zefektivnění stavebních procesů a správy zakázek.</p>
                  <p><strong>3. Vlastnictví dat</strong>: Veškerá data (zákazníci, kalkulace, fotodokumentace, záznamy) zadaná do systému zůstávají výhradním vlastnictvím zákazníka. Zákazník má možnost svá data exportovat.</p>
                  <p><strong>4. Dostupnost služby</strong>: Poskytovatel vyvíjí maximální úsilí pro zajištění plynulého a spolehlivého chodu služby v souladu s běžnými technickými standardy.</p>
                </div>
              </div>
            )}

            {activeLegalModal === 'gdpr' && (
              <div className="space-y-3">
                <h3 className="text-base font-black text-slate-900">Zásady ochrany osobních údajů (GDPR)</h3>
                <p className="text-slate-500 text-[11px]">V souladu s Nařízením EP a Rady (EU) 2016/679</p>
                <div className="space-y-2 text-slate-700">
                  <p><strong>1. Správce údajů</strong>: Správcem osobních údajů uživatelů systému je {COMPANY_NAME}{COMPANY_ICO ? `, IČO: ${COMPANY_ICO}` : ''}, se sídlem {COMPANY_ADDRESS}, e-mail: {COMPANY_EMAIL}. U údajů koncových zákazníků zadaných stavební firmou vystupuje poskytovatel jako zpracovatel.</p>
                  <p><strong>2. Rozsah zpracování</strong>: Zpracováváme identifikační a kontaktní údaje uživatelů (jméno, e-mail, telefon) nezbytné pro plnění smlouvy, poskytování služby a technickou podporu.</p>
                  <p><strong>3. Ukládání a zabezpečení dat</strong>: Data jsou ukládána na zabezpečených serverech s řízeným přístupem a šifrovaným přenosem dat.</p>
                  <p><strong>4. Práva subjektů údajů</strong>: Uživatelé mají právo na přístup ke svým údajům, jejich opravu, výmaz či omezení zpracování zasláním žádosti na {COMPANY_EMAIL}.</p>
                </div>
              </div>
            )}

            {activeLegalModal === 'dpa' && (
              <div className="space-y-3">
                <h3 className="text-base font-black text-slate-900">Smlouva o zpracování osobních údajů (DPA)</h3>
                <p className="text-slate-500 text-[11px]">Podle čl. 28 GDPR</p>
                <div className="space-y-2 text-slate-700">
                  <p><strong>1. Předmět smlouvy</strong>: Poskytovatel zpracovává osobní údaje kontaktních osob a zaměstnanců zákazníka výhradně za účelem plnění smlouvy a na základě pokynů zákazníka.</p>
                  <p><strong>2. Bezpečnostní opatření</strong>: Poskytovatel aplikuje přiměřená technická a organizační opatření k ochraně dat, včetně řízení přístupových práv a šifrované komunikace (HTTPS).</p>
                  <p><strong>3. Mlčenlivost a subdodavatelé</strong>: Osoby mající přístup k datům jsou vázány mlčenlivostí. Zapojení prověření subdodavatelé podléhají standardním smluvním závazkům k ochraně osobních údajů.</p>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 9. Booking Modal (20-min Personal Demo) */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 relative">
            <button
              onClick={() => setIsBookingOpen(false)}
              aria-label="Zavřít konzultaci"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {!bookingSuccess ? (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-600">
                    Nezávazná konzultace (20 min)
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    Ukázat StavbaFlow na mém procesu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Společně projdeme vaše současné tabulky a ukážeme, jak se formulář promění v poptávku, zaměstnanec ji převezme a změní stav zakázky.
                  </p>
                </div>

                {SALES_CONTACT.mode === 'unavailable' && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">Obchodní kontakt zatím není nakonfigurovaný. Formulář nebude předstírat úspěšné odeslání.</span>
                  </div>
                )}

                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Vaše jméno</label>
                    <input
                      type="text"
                      required
                      placeholder="Ing. Petr Novák"
                      value={bookingName}
                      onChange={e => {
                        setBookingName(e.target.value);
                        if (bookingError) setBookingError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Název stavební firmy</label>
                    <input
                      type="text"
                      required
                      placeholder="Střechy & Stavby Novák s.r.o."
                      value={bookingCompany}
                      onChange={e => {
                        setBookingCompany(e.target.value);
                        if (bookingError) setBookingError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Telefonní číslo pro potvrzení</label>
                    <input
                      type="tel"
                      required
                      placeholder="+420 777 123 456"
                      value={bookingPhone}
                      onChange={e => {
                        setBookingPhone(e.target.value);
                        if (bookingError) setBookingError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">E-mail pro zaslání pozvánky</label>
                    <input
                      type="email"
                      required
                      placeholder="petr@novak-stavby.cz"
                      value={bookingEmail}
                      onChange={e => {
                        setBookingEmail(e.target.value);
                        if (bookingError) setBookingError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Preferovaný termín</label>
                    <select
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value="Pondělí 10:00">Pondělí 10:00</option>
                      <option value="Úterý 13:00">Úterý 13:00</option>
                      <option value="Středa 09:00">Středa 09:00</option>
                      <option value="Čtvrtek 14:00">Čtvrtek 14:00</option>
                      <option value="Pátek 11:00">Pátek 11:00</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBookingLoading}
                  className="w-full py-3 bg-[#2563EB] hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isBookingLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Otevírám kontakt...</span>
                    </>
                  ) : (
                    <>
                      <span>{SALES_CONTACT.mode === 'booking' ? 'Otevřít rezervační kalendář' : 'Připravit e-mail s žádostí'}</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900">
                  E-mailová žádost je připravená
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Děkujeme, {bookingName}. Odeslání dokončete ve své e-mailové aplikaci. Termín {bookingDate} je potvrzený až po naší odpovědi.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
