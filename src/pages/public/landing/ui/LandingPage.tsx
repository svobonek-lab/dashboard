import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
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
  ChevronRight,
  ExternalLink,
  PlayCircle,
  HelpCircle,
  Calculator,
  Download,
  Check,
  X
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
    && !(typeof window !== 'undefined' && window.location.hostname.toLowerCase().startsWith('jobflow-pro')),
});
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
  const additionalWonQuarter = Math.max(1, Math.round(wonPerQuarter * 0.2)); // +20% conversion or at least 1 lead
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
    <div className="workspace-shell min-h-screen bg-[#F7F8FA] text-slate-900 font-sans selection:bg-blue-100">
      
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A84FF] text-white font-black text-base flex items-center justify-center shadow-xs">
              SC
            </div>
            <div>
              <span className="text-base font-black text-slate-900 tracking-tight">StavbaFlow</span>
              <span className="text-[10px] font-bold text-slate-500 block -mt-1 uppercase tracking-wider">Operační systém stavby</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a href="#jak-to-funguje" className="hover:text-blue-600 transition-colors">Jak to funguje</a>
            <a href="#problemy" className="hover:text-blue-600 transition-colors">Pro majitele</a>
            <a href="#kalkulacka" className="hover:text-blue-600 transition-colors">Spočítat přínos</a>
            <a href="#cenik" className="hover:text-blue-600 transition-colors">Pilot</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2"
            >
              Přihlásit se
            </button>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="px-4 py-2 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all"
            >
              Domluvit ukázku
            </button>
          </div>
        </div>
      </header>

      {LEGAL_IDENTITY_READINESS.showDevelopmentWarning && (
        <aside role="status" data-testid="legal-identity-development-warning" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-950">
          Vývojová kontrola: doplňte {LEGAL_IDENTITY_READINESS.missing.join(', ')} před ostrým nasazením. Veřejná kontaktní adresa se za právní adresu nepovažuje.
        </aside>
      )}

      {/* 2. Outcome Hero Section (Audit Page 11) */}
      <section className="pt-16 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Building2 className="w-3.5 h-3.5" />
          <span>Pro majitele menších stavebních firem</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
          Mějte každou zakázku<br />
          <span className="text-[#2563EB]">pod kontrolou.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
          StavbaFlow je pracovní dashboard pro menší stavební firmy. Zachytí poptávku z webu, majitel ji přiřadí a zaměstnanec vidí jen práci, kterou má udělat.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setIsBookingOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Ukázat mi StavbaFlow</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => DEMO_DESTINATION.url && window.location.assign(DEMO_DESTINATION.url)}
            disabled={!DEMO_DESTINATION.url}
            title={DEMO_DESTINATION.error || 'Otevřít skutečné demo StavbaFlow'}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-black shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4 text-[#0A84FF]" />
            <span>Prohlédnout živou ukázku</span>
          </button>
        </div>

        {/* Horizontal Workflow Chain */}
        <div id="jak-to-funguje" className="pt-8 border-t border-slate-200/80 max-w-3xl mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Pracovní tok Founding Pilotu
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-slate-700">
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Webový formulář</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Poptávka</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Přiřazení</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Stav zakázky</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-black">Historie změn</span>
          </div>
        </div>
      </section>

      {/* 3. 3 Expensive Problems Section (Audit Page 11) */}
      <section id="problemy" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#FF453A]">
              Kde stavební firma reálně přichází o peníze
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tři momenty, které ničí marži a čas majitele
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Problem 1 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-xl bg-red-100 text-[#FF453A] flex items-center justify-center font-bold text-xs">
                  01
                </span>
                <h3 className="text-base font-black text-slate-900">Poptávka bez okamžité reakce</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Zákazník odešle poptávku přes web. Zpráva zapadne v e-mailu a nikdo neví, kdo ji má převzít. Mezitím zákazník osloví další firmy a zakázka se ztrácí.
                </p>
              </div>
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                <strong className="block text-blue-950 font-bold mb-0.5">Řešení StavbaFlow:</strong>
                Každá webová poptávka se uloží do správné firmy, má jasný stav a lze ji přiřadit konkrétnímu zaměstnanci.
              </div>
            </div>

            {/* Problem 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-[#FF9F0A] flex items-center justify-center font-bold text-xs">
                  02
                </span>
                <h3 className="text-base font-black text-slate-900">Zakázka bez odpovědnosti</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Majitel ví, že zakázka existuje, ale nevidí, kdo ji převzal a v jakém je stavu. Informace zůstávají v telefonech a skupinových chatech.
                </p>
              </div>
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                <strong className="block text-blue-950 font-bold mb-0.5">Řešení StavbaFlow:</strong>
                Majitel vidí společný Kanban, přiřazeného pracovníka a skutečně uložený stav i po novém přihlášení.
              </div>
            </div>

            {/* Problem 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-[#34C759] flex items-center justify-center font-bold text-xs">
                  03
                </span>
                <h3 className="text-base font-black text-slate-900">Zaměstnanec vidí příliš mnoho</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Běžné sdílené tabulky zpřístupní celý seznam klientů každému. To komplikuje práci a zbytečně rozšiřuje přístup k firemním datům.
                </p>
              </div>
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                <strong className="block text-blue-950 font-bold mb-0.5">Řešení StavbaFlow:</strong>
                Zaměstnanec po přihlášení vidí pouze přidělené zakázky a může měnit jen povolené kroky realizace.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Real Story Breakdown (Audit Page 12) */}
      <section id="pribeh" className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600">
            Jeden příběh zakázky
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Formulář → poptávka → přiřazení → stav → historie
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Tento průchod je určen k přejímce v odděleném stagingu před vložením zákaznických dat. Aplikace nevrátí demonstrační úspěch, pokud se zápis nepodaří.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">1</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">1. Webová poptávka</h4>
                  <p className="text-[11px] text-slate-500">Formulář firmy vytvoří právě jednu poptávku v jejím workspace.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">2</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">2. Kontrola majitelem</h4>
                  <p className="text-[11px] text-slate-500">Majitel poptávku otevře, zkontroluje údaje a přiřadí odpovědného člověka.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">3</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">3. Práce zaměstnance</h4>
                  <p className="text-[11px] text-slate-500">Zaměstnanec vidí jen přidělenou zakázku a provede povolený posun stavu.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-black text-xs flex items-center justify-center">4</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">4. Trvalá historie</h4>
                  <p className="text-[11px] text-slate-500">Stav, přiřazení a auditní událost zůstávají uložené po odhlášení i reloadu.</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                <span>SCÉNÁŘ PILOTU</span>
                <span className="text-emerald-400">TENANT SCOPE</span>
              </div>
              <div className="space-y-1 text-slate-200">
                <p>Zdroj: formulář na webu firmy</p>
                <p>Role: majitel a přiřazený zaměstnanec</p>
                <p>Oddělení: před zákaznickými daty ověřit firmu A vs. B</p>
                <p>Import: kontrolovaný CSV dry-run a commit</p>
                <p className="text-emerald-400 font-bold pt-1">Cíl: uložená data bez demo fallbacku</p>
              </div>
              <button
                onClick={() => DEMO_DESTINATION.url && window.location.assign(DEMO_DESTINATION.url)}
                disabled={!DEMO_DESTINATION.url}
                title={DEMO_DESTINATION.error || 'Otevřít skutečné demo StavbaFlow'}
                className="w-full mt-3 py-2 bg-[#0A84FF] text-white rounded-xl text-xs font-sans font-bold hover:bg-blue-600 transition-all"
              >
                Vyzkoušet tento scénář v demu →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. User-Driven ROI Calculator (Audit Page 13) */}
      <section id="kalkulacka" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center justify-center gap-1.5">
              <Calculator className="w-4 h-4" />
              Modelová kalkulačka pro vaši firmu
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Spočítejte si přínos na vašich reálných číslech
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Výsledek je orientační scénář založený na vámi zadaných předpokladech. Není příslibem budoucího zisku ani úspory.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sliders (7 cols) */}
            <div className="lg:col-span-7 space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-200">
              
              {/* Slider 1: Leads */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Kolik poptávek dostáváte měsíčně?</span>
                  <span className="text-blue-600 font-mono text-sm">{monthlyLeads} poptávek</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={monthlyLeads}
                  onChange={e => setMonthlyLeads(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 2: Quoted % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Kolik z nich dostane cenovou nabídku?</span>
                  <span className="text-blue-600 font-mono text-sm">{quotedRate} % ({calculatedQuotes} nabídek)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={quotedRate}
                  onChange={e => setQuotedRate(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 3: Win rate % */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Kolik odeslaných nabídek reálně vyhrajete?</span>
                  <span className="text-blue-600 font-mono text-sm">{winRate} %</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={winRate}
                  onChange={e => setWinRate(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Slider 4: Avg Gross Margin */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Průměrná hrubá marže jedné zakázky?</span>
                  <span className="text-blue-600 font-mono text-sm">{avgMargin.toLocaleString('cs-CZ')} Kč</span>
                </div>
                <input
                  type="range"
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
                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>Kolik hodin týdně tráví kancelář přepisováním?</span>
                  <span className="text-blue-600 font-mono text-sm">{adminHoursWeekly} h / týdně</span>
                </div>
                <input
                  type="range"
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
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Modelový kvartální přínos (3 měsíce)
                </span>
                <div className="text-3xl font-black text-white mt-1">
                  +{additionalMarginQuarter.toLocaleString('cs-CZ')} Kč
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Scénář počítá s {additionalWonQuarter} dodatečně získanou zakázkou. Skutečný výsledek závisí na procesu vaší firmy.
                </p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Modelovaná úspora času:</span>
                  <strong className="text-white">{adminHoursSavedQuarter} hodin / kvartál</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tarif Start za 3 měsíce:</span>
                  <strong className="text-slate-300">{starterQuarterCost.toLocaleString('cs-CZ')} Kč (bez DPH)</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                  <span>Návratnost investice (ROI):</span>
                  <span>{roiMultiplier}× vložených nákladů</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 text-[11px] text-slate-300 leading-relaxed">
                Ilustrativní výpočet s orientačními hodnotami. Model používá zadanou průměrnou marži a předpoklad lepšího zpracování poptávek; nejde o příslib výsledku. Skutečný přínos ověříme na datech během pilotu.
              </div>

              <button
                onClick={() => setIsBookingOpen(true)}
                className="w-full py-3 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all shadow-md"
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
            <h2 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-slate-950">Tarif podle velikosti vašeho týmu.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 lg:justify-self-end">
            Měsíční ceny jsou bez DPH. Vyberte kapacitu podle počtu zaměstnanců.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <article className="flex min-h-[340px] flex-col border-t-4 border-slate-300 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-950">Start</h3>
            <p className="mt-1 text-sm text-slate-600">Pro menší tým</p>
            <p className="mt-7 text-4xl font-black tracking-tight text-slate-950">1 990 Kč</p>
            <p className="mt-1 text-sm text-slate-500">měsíčně bez DPH</p>
            <p className="mt-6 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-800">Až 5 zaměstnanců</p>
            <a href={START_REGISTRATION_URL} className="mt-auto inline-flex min-h-12 items-center justify-center bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              Pokračovat s tarifem Start
            </a>
          </article>

          <article className="flex min-h-[340px] flex-col border-t-4 border-blue-600 bg-blue-50/60 p-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-950">Růst</h3>
            <p className="mt-1 text-sm text-slate-600">Pro rostoucí firmu</p>
            <p className="mt-7 text-4xl font-black tracking-tight text-slate-950">2 990 Kč</p>
            <p className="mt-1 text-sm text-slate-500">měsíčně bez DPH</p>
            <p className="mt-6 border-t border-blue-200 pt-4 text-sm font-semibold text-slate-800">Až 15 zaměstnanců</p>
            <a href={GROWTH_REGISTRATION_URL} className="mt-auto inline-flex min-h-12 items-center justify-center bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
              Pokračovat s tarifem Růst
            </a>
          </article>

          <article className="flex min-h-[340px] flex-col border-t-4 border-slate-900 bg-slate-950 p-6 text-white">
            <h3 className="text-xl font-extrabold">Profi</h3>
            <p className="mt-1 text-sm text-slate-300">Pro větší provoz</p>
            <p className="mt-7 text-4xl font-black tracking-tight">4 990 Kč</p>
            <p className="mt-1 text-sm text-slate-300">měsíčně bez DPH</p>
            <p className="mt-6 border-t border-slate-700 pt-4 text-sm font-semibold">Neomezený počet zaměstnanců</p>
            <p className="mt-5 text-sm leading-6 text-slate-300">Databázový konektor: připravujeme, únor 2027.</p>
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Časté otázky</span>
            <h2 className="text-2xl font-black text-slate-900">Odpovědi na to nejdůležitější</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="font-black text-slate-900 text-sm">Jak dostaneme do systému současná data?</h4>
              <p className="text-slate-600 leading-relaxed">
                Scénář pilotu počítá s kontrolovaným CSV importem. Před potvrzením je potřeba ověřit mapování, chyby i opakovaný běh. V režimu Managed Cloud se data neukládají do původní firemní databáze.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="font-black text-slate-900 text-sm">Co zaměstnanec po přihlášení uvidí?</h4>
              <p className="text-slate-600 leading-relaxed">
                Přejímka ověřuje, že zaměstnanec vidí jen zakázky přiřazené jeho účtu a databázová pravidla mu nedovolí měnit údaje firmy ani cizí zakázky.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="font-black text-slate-900 text-sm">Je systém připravený na přímé propojení s naší SQL databází?</h4>
              <p className="text-slate-600 leading-relaxed">
                V prvním pilotu ne. Začínáme bezpečným CSV importem bez zápisu zpět. Přímé propojení se nacení a ověří samostatně až po úspěšném pilotu.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-12 bg-slate-950 text-white border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#0A84FF] text-white font-bold flex items-center justify-center text-xs">
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
              <span>IČO: {COMPANY_ICO || 'nedoplněno'} · Právní adresa: {LEGAL_COMPANY_ADDRESS || 'nedoplněna'} · VOP: {String(LANDING_ENV.VITE_COMPANY_VOP_APPROVED || '').toLowerCase() === 'true' ? 'schválené' : 'připravit a schválit'}.</span>
              <span className="block">Údaje doplní provozovatel před uzavřením smlouvy a ostrým spuštěním.</span>
            </section>
          )}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>
              <span>
                {COMPANY_LEGAL_DETAILS_CONFIGURED
                  ? [COMPANY_NAME, `IČO: ${COMPANY_ICO}`, LEGAL_COMPANY_ADDRESS].join(' · ')
                  : COMPANY_NAME}
              </span>
            </div>
            <div>
              <a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-white transition-colors">Kontakt: {COMPANY_EMAIL}</a>
              <span className="block">Veřejná kontaktní adresa: {PUBLIC_CONTACT_ADDRESS}</span>
              {COMPANY_PHONE && <span> · Tel: {COMPANY_PHONE}</span>}
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
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {!bookingSuccess ? (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Nezávazná konzultace (20 min)
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    Ukázat StavbaFlow na mém procesu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Společně projdeme vaše současné tabulky a ukážeme pilotní tok formulář → poptávka → zaměstnanec → stav zakázky.
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
                  className="w-full py-3 bg-[#0A84FF] hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isBookingLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Otevírám kontakt...</span>
                    </>
                  ) : (
                    <>
                      <span>{SALES_CONTACT.mode === 'booking' ? 'Otevřít rezervační kalendář' : 'Připravit e-mail s žádostí'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
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
