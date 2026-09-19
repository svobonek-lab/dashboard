import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Phone, 
  Send, 
  HardHat, 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  Camera, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Building2,
  FileCheck
} from 'lucide-react';
import { useRouter } from '../src/app/router';

export const InteractiveStoryDemo: React.FC = () => {
  const { navigate } = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Demo interactive states
  const [step1Called, setStep1Called] = useState(false);
  const [step2QuoteSent, setStep2QuoteSent] = useState(false);
  const [step3WorkLogged, setStep3WorkLogged] = useState(false);

  // Controlled Demo Pipeline
  const demoProjects = [
    { client: 'Petra Dvořáková', project: 'Rekonstrukce koupelny', amount: '353 000 Kč', status: step2QuoteSent ? 'Realizace' : step1Called ? 'Zaměření' : 'Nová poptávka', badge: step1Called ? 'SLA splněno (9 min)' : 'Zbývá 12 min SLA' },
    { client: 'SVJ Javorová', project: 'Zateplení bytového domu', amount: '640 000 Kč', status: 'Realizace', badge: 'Harmonogram OK' },
    { client: 'Karel Beneš', project: 'Výměna střešní krytiny', amount: '486 000 Kč', status: 'Nabídka', badge: 'Čeká 4 dny na odpověď' },
    { client: 'Novostavba RD Černý', project: 'Hrubá stavba RD', amount: '1 548 000 Kč', status: 'Smlouva', badge: 'Faktura 8 dní po splatnosti' },
    { client: 'Pergola Horák', project: 'Hliníková pergola', amount: '165 000 Kč', status: 'Odmítnuto', badge: 'Důvod: Cena (archivováno)' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 font-sans text-slate-900">
      
      {/* Return back to CRM header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-[#0A84FF]" />
          <span>Zpět do CRM přehledu</span>
        </button>
        <span className="text-xs font-bold text-slate-400">
          StavbaCore Interactive Demo
        </span>
      </div>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="max-w-2xl space-y-2 relative z-10">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider backdrop-blur-xs">
            Interaktivní 4-krokový scénář
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Příběh zakázky: Od poptávky po marži v kapse
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Vyzkoušejte si, jak StavbaCore zařídí, že žádná poptávka nezapadne, nabídka se nezapomene a terén okamžitě propíše skutečné náklady majiteli.
          </p>
        </div>

        {/* 4 Step Progress Pills */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/20 relative z-10 text-xs font-bold">
          <div className={`p-2 rounded-xl text-center transition-all ${currentStep === 1 ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 text-white'}`}>
            1. Poptávka & SLA
          </div>
          <div className={`p-2 rounded-xl text-center transition-all ${currentStep === 2 ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 text-white'}`}>
            2. Nabídka & Přijetí
          </div>
          <div className={`p-2 rounded-xl text-center transition-all ${currentStep === 3 ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 text-white'}`}>
            3. Terén & Náklady
          </div>
          <div className={`p-2 rounded-xl text-center transition-all ${currentStep === 4 ? 'bg-white text-blue-900 shadow-md' : 'bg-white/10 text-white'}`}>
            4. Výsledek majitele
          </div>
        </div>
      </div>

      {/* STEP 1: POPTÁVKA */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Krok 1 ze 4</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Poptávka z webu: Petra Dvořáková — Rekonstrukce koupelny (353 000 Kč)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Formulář přišel před 3 minutami. Bez systému by ležel v e-mailu. Ve StavbaCore běží SLA odpočet 15 minut.
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${step1Called ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'}`}>
              {step1Called ? '✓ Kontaktováno (SLA splněno)' : 'SLA vyprší za 12 min'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Zákazník:</span>
              <strong className="text-slate-900">Petra Dvořáková (+420 774 233 119)</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Poptávané dílo:</span>
              <strong className="text-slate-900">Kompletní rekonstrukce koupelny v bytě, Praha 6</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Odhadovaná hodnota:</span>
              <strong className="text-blue-600 font-mono text-sm">353 000 Kč vč. DPH</strong>
            </div>
          </div>

          {!step1Called ? (
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <span className="text-xs text-slate-500">
                👉 Klikněte na tlačítko níže pro simulaci hovoru a zastavení SLA:
              </span>
              <button
                onClick={() => setStep1Called(true)}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Kliknout: „Volal jsem klientce“</span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>SLA se zastavilo v čase 9 minut. Do historie zapsán hovor s Petrou Dvořákovou a vytvořen úkol: „Osobní zaměření ve čtvrtek 09:00“.</span>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all"
              >
                <span>Pokračovat na Krok 2: Odeslání nabídky</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: NABÍDKA */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Krok 2 ze 4</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Kalkulace a digitální schválení nabídky klientem
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Zaměření proběhlo. StavbaCore vygeneruje položkový rozpočet a pošle bezpečný klientský odkaz.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {step2QuoteSent ? 'Nabídka přijata investorem' : 'Příprava rozpočtu'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>1. Bourací práce a odvoz suti (kontejner 6m³)</span>
              <strong className="font-mono">38 000 Kč</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>2. Nové rozvody vody a odpadu (materiál PPR + práce)</span>
              <strong className="font-mono">54 000 Kč</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>3. Hydroizolace a velkoformátové obklady (42 m²)</span>
              <strong className="font-mono">142 000 Kč</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>4. Kompletace sanitární keramiky a baterií</span>
              <strong className="font-mono">48 000 Kč</strong>
            </div>
            <div className="flex justify-between py-1 pt-2 font-bold text-sm text-slate-900">
              <span>Celkem s DPH (12% snížená sazba):</span>
              <strong className="font-mono text-blue-600">353 000 Kč (Marže 28,4 %)</strong>
            </div>
          </div>

          {!step2QuoteSent ? (
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <span className="text-xs text-slate-500">
                👉 Klikněte pro odeslání odkazu a simulaci schválení investorkou:
              </span>
              <button
                onClick={() => setStep2QuoteSent(true)}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Simulovat: „Odeslat a Schválit v klientském portálu“</span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Petra Dvořáková nabídku schválila. Zakázka se automaticky přepnula do stavu „Realizace“, do kalendáře naskočil harmonogram a sklad rezervoval materiál.</span>
              </div>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all"
              >
                <span>Pokračovat na Krok 3: Terén & práce řemeslníka</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: TERÉN */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Krok 3 ze 4</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Mobilní rozhraní řemeslníka na stavbě (Jan Svoboda)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Řemeslník v terénu nepotřebuje složité tabulky. V mobilu jedním klikem zapne časomíru, vyfotí stav a zadá koupený materiál.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Mobilní pohled terénu
            </span>
          </div>

          <div className="max-w-md mx-auto p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Přihlášen řemeslník</span>
                <h4 className="text-xs font-bold">Jan Svoboda · Obkladač</h4>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 space-y-2">
              <span className="text-[10px] text-amber-400 font-bold uppercase">Dnešní úkol</span>
              <p className="text-xs font-bold">Petra Dvořáková — Hydroizolace koupelny</p>
              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                <span>Vykázaný čas: <strong>6,5 h</strong></span>
                <span>Materiál: <strong>7 840 Kč</strong></span>
              </div>
            </div>

            {!step3WorkLogged ? (
              <button
                onClick={() => setStep3WorkLogged(true)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Uložit denní výkaz (6,5 h + foto + 7 840 Kč)</span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Výkaz uložen! Majitel firmy má okamžitý přehled o nákladech.</span>
              </div>
            )}
          </div>

          {step3WorkLogged && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 transition-all"
              >
                <span>Přejít na Krok 4: Výsledek v dashboardu majitele</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: VÝSLEDEK MAJITELE */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Krok 4 ze 4: Hotovo</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Okamžitý přepočet marže, nákladů a kapacity
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Zatímco konkurence počítá zisk z papírů po víkendech, majitel StavbaCore vidí čistá čísla v reálném čase.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Přesná ziskovost
            </span>
          </div>

          {/* Recalculated Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Aktivní zakázka</span>
              <div className="text-lg font-black text-slate-900 mt-1">353 000 Kč</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Petra Dvořáková (Koupelna)</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Skutečné náklady</span>
              <div className="text-lg font-black text-slate-900 mt-1">7 840 Kč mat. + 6,5 h</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Vykázal Jan Svoboda dnes</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Skutečná marže</span>
              <div className="text-lg font-black text-emerald-700 mt-1">27,8 % (98 134 Kč)</div>
              <p className="text-[11px] text-emerald-700 mt-0.5">Předpoklad rozpočtu dodržen</p>
            </div>
          </div>

          {/* Controlled Problems Table */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Přehled rizik a problémů pod kontrolou
              </h3>
              <span className="text-[11px] text-slate-500">Reálná firma má problémy — StavbaCore je hlídá</span>
            </div>
            <div className="divide-y divide-slate-200 text-xs">
              {demoProjects.map((p, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900">{p.client}</strong>
                    <span className="text-slate-500"> · {p.project}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-800">{p.amount}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200">
                      {p.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conclusion Call to Action (Page 16 of audit) */}
          <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-3 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-black">Takhle může vypadat vaše firma.</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Za 20 minut projdeme váš dnešní proces a ukážeme, co by StavbaCore převzal a kolik ušetří.
              </p>
            </div>
            <div className="flex gap-2 pt-2 sm:pt-0 justify-center">
              <button
                onClick={() => navigate('/landing')}
                className="px-5 py-2.5 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Ukázat na mém procesu (20 min)
              </button>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setStep1Called(false);
                  setStep2QuoteSent(false);
                  setStep3WorkLogged(false);
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                title="Spustit demo znovu"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
