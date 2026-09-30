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
import { useRouter } from '../src/app/router';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const COMPANY_NAME = ((import.meta as any).env?.VITE_COMPANY_NAME || '').trim() || 'DOPLNIT';
const COMPANY_ICO = ((import.meta as any).env?.VITE_COMPANY_ICO || '').trim();
const COMPANY_ADDRESS = ((import.meta as any).env?.VITE_COMPANY_ADDRESS || '').trim() || 'DOPLNIT';
const COMPANY_EMAIL = ((import.meta as any).env?.VITE_COMPANY_EMAIL || '').trim() || 'DOPLNIT';
const COMPANY_PHONE = ((import.meta as any).env?.VITE_COMPANY_PHONE || '').trim() || 'DOPLNIT';
const COMPANY_DETAILS_CONFIGURED = [COMPANY_NAME, COMPANY_ADDRESS, COMPANY_EMAIL, COMPANY_PHONE].every((value) => value !== 'DOPLNIT');

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
  const [bookingStoredLocally, setBookingStoredLocally] = useState(false);
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
  const growthCostQuarter = 6990 * 3; // 20 970 Kč
  const roiMultiplier = (additionalMarginQuarter / growthCostQuarter).toFixed(1);
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

    setIsBookingLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.rpc('submit_demo_booking', {
          p_name: bookingName.trim(),
          p_company: bookingCompany.trim(),
          p_phone: bookingPhone.trim(),
          p_email: bookingEmail.trim(),
          p_preferred_time: bookingDate
        });

        if (error) {
          console.error('submit_demo_booking RPC error:', error);
          const contactMsg = COMPANY_PHONE !== 'DOPLNIT' && COMPANY_EMAIL !== 'DOPLNIT'
            ? `kontaktujte nás prosím na ${COMPANY_PHONE} nebo ${COMPANY_EMAIL}.`
            : 'kontaktujte prosím naši technickou podporu.';
          setBookingError(`Rezervaci se nepodařilo odeslat, ${contactMsg}`);
          setIsBookingLoading(false);
          return;
        }
      } else {
        // Režim bez Supabase (lokální demo)
        const bookingData = {
          name: bookingName.trim(),
          company: bookingCompany.trim(),
          phone: bookingPhone.trim(),
          email: bookingEmail.trim(),
          preferred_time: bookingDate,
          status: 'new'
        };
        const stored = JSON.parse(localStorage.getItem('stavbacore_demo_bookings') || '[]');
        stored.push({ ...bookingData, id: 'demo-' + Date.now(), created_at: new Date().toISOString() });
        localStorage.setItem('stavbacore_demo_bookings', JSON.stringify(stored));
        setBookingStoredLocally(true);
      }

      setBookingSuccess(true);
    } catch (err) {
      console.error('Booking unexpected error:', err);
      const contactMsg = COMPANY_PHONE !== 'DOPLNIT' && COMPANY_EMAIL !== 'DOPLNIT'
        ? `kontaktujte nás prosím na ${COMPANY_PHONE} nebo ${COMPANY_EMAIL}.`
        : 'kontaktujte prosím naši technickou podporu.';
      setBookingError(`Rezervaci se nepodařilo odeslat, ${contactMsg}`);
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
              <span className="text-base font-black text-slate-900 tracking-tight">StavbaCore</span>
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
          StavbaCore je pracovní dashboard pro stavební firmy. Poptávka, nabídka, tým i realizace jsou na jednom místě a každý vidí svůj další krok.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setIsBookingOpen(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Ukázat mi StavbaCore</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.location.assign('/demo')}
            className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-black shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-4 h-4 text-[#0A84FF]" />
            <span>Prohlédnout živou ukázku</span>
          </button>
        </div>

        {/* Horizontal Workflow Chain */}
        <div id="jak-to-funguje" className="pt-8 border-t border-slate-200/80 max-w-3xl mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
            Jeden pracovní tok pro celou firmu
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-slate-700">
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Poptávky</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Nabídky</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Realizace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Náklady</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-2xs">Předání</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-black">POHODA XML</span>
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
                <strong className="block text-blue-950 font-bold mb-0.5">Řešení StavbaCore:</strong>
                Každá poptávka má přiděleného vlastníka, SLA odpočet a předpřipravený hovor.
              </div>
            </div>

            {/* Problem 2 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-[#FF9F0A] flex items-center justify-center font-bold text-xs">
                  02
                </span>
                <h3 className="text-base font-black text-slate-900">Cenová nabídka bez follow-upu</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kancelář stráví 4 hodiny kalkulací a odešle PDF. Pak se na nabídku zapomene. Zákazník váhá nebo má doplňující dotaz, ale nikdo se neozve. Zakázka vyšumí.
                </p>
              </div>
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                <strong className="block text-blue-950 font-bold mb-0.5">Řešení StavbaCore:</strong>
                Automatický systém hlídá datum dalšího kontaktu a upozorní majitele dřív, než klient odejde.
              </div>
            </div>

            {/* Problem 3 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-[#34C759] flex items-center justify-center font-bold text-xs">
                  03
                </span>
                <h3 className="text-base font-black text-slate-900">Realizace bez průběžné marže</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mistři a řemeslníci nosí účtenky za materiál v kapse. Hodiny a nákupy se spočítají až na konci stavby — když už s propadem marže nejde nic udělat.
                </p>
              </div>
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium">
                <strong className="block text-blue-950 font-bold mb-0.5">Řešení StavbaCore:</strong>
                Terén zapisuje materiál a hodiny přes mobil. Majitel vidí plán vs. skutečnost v reálném čase.
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
            Petra Dvořáková · Rekonstrukce koupelny (353 000 Kč)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Podívejte se, jak se zakázka pohybuje systémem od prvního kliku po předávací protokol.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">1</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">08:42 Webová poptávka</h4>
                  <p className="text-[11px] text-slate-500">Formulář na webu okamžitě založí kartu zakázky a spustí SLA.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">2</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">08:51 Telefonát a domluvené zaměření</h4>
                  <p className="text-[11px] text-slate-500">Hovor proveden za 9 minut. Do kalendáře naskakuje termín prohlídky.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center">3</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">14:38 Nabídka odeslána & přijata</h4>
                  <p className="text-[11px] text-slate-500">Klient schválí položkový rozpočet jedním klikem v klientském portálu.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 font-black text-xs flex items-center justify-center">4</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Dnes: Realizace & marže 27,8 %</h4>
                  <p className="text-[11px] text-slate-500">Jan v terénu zapsal 6,5 h a materiál 7 840 Kč. Marže je chráněna.</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                <span>OPERAČNÍ KARTA ZAKÁZKY</span>
                <span className="text-emerald-400">AKTIVNÍ REALIZACE</span>
              </div>
              <div className="space-y-1 text-slate-200">
                <p>Klient: Petra Dvořáková (Praha 6)</p>
                <p>Smluvní cena: 353 000 Kč vč. DPH</p>
                <p>Vykázaný materiál: 7 840 Kč</p>
                <p>Odpracovaný čas: 14,5 h (Jan & Martin)</p>
                <p className="text-emerald-400 font-bold pt-1">Výsledná marže: 27,8 % (98 134 Kč)</p>
              </div>
              <button
                onClick={() => window.location.assign('/demo')}
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
              Realistická ROI kalkulačka pro vaši firmu
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Spočítejte si přínos na vašich reálných číslech
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Žádné marketingové sliby. Pohybujte posuvníky podle vaší skutečné situace a podívejte se na výsledek.
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
                  step="5000"
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
                  Kvartální přínos pro firmu (3 měsíce)
                </span>
                <div className="text-3xl font-black text-white mt-1">
                  +{additionalMarginQuarter.toLocaleString('cs-CZ')} Kč
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Dodatečný zisk z {additionalWonQuarter} zachráněné zakázky díky rychlé reakci a hlídání follow-upů.
                </p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ušetřený čas kanceláře:</span>
                  <strong className="text-white">{adminHoursSavedQuarter} hodin / kvartál</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cena tarifu Growth (3 měsíce):</span>
                  <strong className="text-slate-300">20 970 Kč (bez DPH)</strong>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                  <span>Návratnost investice (ROI):</span>
                  <span>{roiMultiplier}× vložených nákladů</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 text-[11px] text-slate-300 leading-relaxed">
                „Pokud systém pomůže získat o pouhou jednu zakázku za 3 měsíce více, její příspěvek na marži je <strong>{additionalMarginQuarter.toLocaleString('cs-CZ')} Kč</strong>. Systém se zaplatí už v prvních týdnech.“
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

      {/* 6. Pricing & Founding Pilot (Audit Pages 13-14) */}
      <section id="cenik" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600">
            Férový transparentní model
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Začněte Founding Pilotem bez rizika
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Žádné dlouhé smlouvy předem. První měsíc osobně ověříme přínos ve vaší firmě. Všechny ceny jsou uvedeny bez DPH.
          </p>
        </div>

        {/* Founding Pilot Highlight Card */}
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-blue-800/80 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wider">
                Doporučený první krok
              </span>
              <h3 className="text-xl font-black text-white mt-1">Founding Pilot na 30 dní</h3>
            </div>
            <div className="text-right sm:text-right">
              <div className="text-2xl sm:text-3xl font-black font-mono text-white">7 900 Kč</div>
              <span className="text-[11px] text-blue-300">jednorázově za 30 dní (bez DPH)</span>
            </div>
          </div>

          <p className="text-xs text-blue-100 leading-relaxed">
            Osobní nastavení vašich šablon a cen, import stávajících kontaktů, nasazení webového formuláře, zaškolení mistrů a kompletní Growth workflow.
          </p>

          <div className="p-3 bg-white/10 rounded-xl text-xs text-blue-200 border border-white/15">
            💡 <strong>Garance spokojenosti:</strong> Pokud budete po 30 dnech pokračovat na roční tarif Growth, částka 7 900 Kč se v plné výši započte proti ceně předplatného.
          </div>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Rezervovat termín zahájení pilotu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Standard Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* Start Plan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-base font-black text-slate-900">Start</h4>
              <p className="text-xs text-slate-500">Pro menší stavební partu s jedním dispečerem.</p>
              <div className="text-2xl font-black text-slate-900 font-mono">
                2 990 Kč <span className="text-xs font-normal text-slate-500">/ měsíc (bez DPH)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ Do 3 aktivních uživatelů</li>
                <li className="flex items-center gap-2">✓ Poptávky, Kanban a SLA</li>
                <li className="flex items-center gap-2">✓ PDF cenové nabídky</li>
                <li className="flex items-center gap-2">✓ POHODA XML export kontaktů</li>
              </ul>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              Zvolit Start
            </button>
          </div>

          {/* Growth Plan */}
          <div className="bg-white p-6 rounded-2xl border-2 border-blue-500 shadow-md space-y-4 flex flex-col justify-between relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider">
              Nejpopulárnější
            </span>
            <div className="space-y-3">
              <h4 className="text-base font-black text-slate-900">Growth</h4>
              <p className="text-xs text-slate-500">Pro rostoucí firmu s terénními týmy a maržemi.</p>
              <div className="text-2xl font-black text-[#0A84FF] font-mono">
                6 990 Kč <span className="text-xs font-normal text-slate-500">/ měsíc (bez DPH)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2 font-bold">✓ Do 10 aktivních uživatelů</li>
                <li className="flex items-center gap-2">✓ Mobilní rozhraní pro řemeslníky</li>
                <li className="flex items-center gap-2">✓ Sledování materiálu a marže</li>
                <li className="flex items-center gap-2">✓ Klientský portál investora</li>
                <li className="flex items-center gap-2">✓ POHODA XML export</li>
              </ul>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="w-full py-2.5 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-black shadow-xs transition-all"
            >
              Zvolit Growth
            </button>
          </div>

          {/* Custom Plan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-base font-black text-slate-900">Custom</h4>
              <p className="text-xs text-slate-500">Pro větší stavební firmy vyžadující individuální propojení.</p>
              <div className="text-2xl font-black text-slate-900 font-mono">
                od 14 900 Kč <span className="text-xs font-normal text-slate-500">/ měsíc (bez DPH)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">✓ Neomezený počet uživatelů</li>
                <li className="flex items-center gap-2">✓ Zakázkové napojení ERP / SQL</li>
                <li className="flex items-center gap-2">✓ Dedikovaný onboarding manažer</li>
                <li className="flex items-center gap-2">✓ Vlastní SLA a podpora</li>
              </ul>
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              Poptat Custom
            </button>
          </div>

        </div>
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
              <h4 className="font-black text-slate-900 text-sm">Jak funguje propojení s POHODOU?</h4>
              <p className="text-slate-600 leading-relaxed">
                Pilotní export kontaktů a faktur probíhá přes standardizovaný Stormware XML dataPack (verze 2.0). Stačí vygenerovat XML soubor přímo ze zakázky a naimportovat do POHODY.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="font-black text-slate-900 text-sm">Zvládnou mobilní aplikaci naši řemeslníci na stavbě?</h4>
              <p className="text-slate-600 leading-relaxed">
                Ano. Rozhraní pro terén je extrémně jednoduché. Přehledný stav zakázky, záznam odpracovaného času, materiál a možnost přiložit fotodokumentaci ze stavby.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <h4 className="font-black text-slate-900 text-sm">Můžeme svá data kdykoliv exportovat?</h4>
              <p className="text-slate-600 leading-relaxed">
                Všechna data jsou vaše. Kdykoliv můžete stáhnout kompletní ZIP archiv firemních dat, cenové nabídky v PDF i XML pro účetní systémy.
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
              <span className="font-bold">StavbaCore © 2026</span>
              <span className="text-slate-500">· Operační systém pro české stavební firmy</span>
            </div>
            <div className="flex flex-wrap gap-4 text-slate-400">
              <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Přihlášení</button>
              <button onClick={() => window.location.assign('/demo')} className="hover:text-white transition-colors">Interaktivní demo</button>
              <button onClick={() => setIsBookingOpen(true)} className="hover:text-white transition-colors">Osobní ukázka (20 min)</button>
              <button onClick={() => setActiveLegalModal('vop')} className="hover:text-white transition-colors">VOP</button>
              <button onClick={() => setActiveLegalModal('gdpr')} className="hover:text-white transition-colors">GDPR & Soukromí</button>
              <button onClick={() => setActiveLegalModal('dpa')} className="hover:text-white transition-colors">Zpracovatelská smlouva (DPA)</button>
            </div>
          </div>
          {COMPANY_DETAILS_CONFIGURED && <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>
              <span>
                {[COMPANY_NAME, COMPANY_ICO ? `IČO: ${COMPANY_ICO}` : null, COMPANY_ADDRESS]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <div>
              <span>Kontakt: {COMPANY_EMAIL} · Tel: {COMPANY_PHONE}</span>
            </div>
          </div>}
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

            {!COMPANY_DETAILS_CONFIGURED ? (
              <div className="space-y-3">
                <h3 className="text-base font-black text-slate-900">Právní dokumenty připravujeme</h3>
                <p className="text-slate-600 leading-relaxed">
                  Tento náhled běží v demonstračním režimu. Identifikační údaje provozovatele a finální znění dokumentů se doplní před podpisem smlouvy a ostrým spuštěním.
                </p>
                <p className="text-slate-500 text-[11px]">
                  Pro obchodní ukázku kontaktujte tým StavbaCore. Do produkce se tato stránka nasadí až po právní kontrole a vyplnění firemních údajů.
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
                    Ukázat StavbaCore na mém procesu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Společně projdeme vaše současné tabulky a ukážeme, co by systém převzal a kolik marže zachrání.
                  </p>
                </div>

                {!isSupabaseConfigured && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold">Ukázkový režim – rezervace se neodešle</span>
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
                      <span>Odesílám rezervaci...</span>
                    </>
                  ) : (
                    <>
                      <span>Potvrdit nezávaznou rezervaci ukázky</span>
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
                  {bookingStoredLocally ? 'Ukázka je připravena v tomto prohlížeči' : 'Termín ukázky je zarezervován'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {bookingStoredLocally
                    ? `Děkujeme, ${bookingName}. V tomto náhledu se rezervace pouze uložila lokálně a nikam se neodeslala. Pro skutečné potvrzení nám napište na firemní kontakt.`
                    : `Děkujeme, ${bookingName}. Na číslo ${bookingPhone} vám odešleme potvrzení termínu (${bookingDate}) a odkaz na videohovor.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
