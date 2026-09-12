import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Clock, ArrowUpRight, Sparkles, CheckCircle2, ShieldAlert, DollarSign, Star, FileText } from 'lucide-react';
import { CompanyBranding } from '../types';

interface AnalyticsPageProps {
  branding: CompanyBranding;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ branding }) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [executiveReport, setExecutiveReport] = useState<any | null>(null);

  const handleGenerateExecutiveReport = () => {
    setIsGeneratingReport(true);
    setTimeout(() => {
      setIsGeneratingReport(false);
      setExecutiveReport({
        title: "CEO Weekly Executive Intelligence Report",
        period: "Week 37, September 2026",
        wins: [
          "Record high lead conversion rate (42.8%) driven by instant AI chatbot interactions.",
          "Completed 14 major projects on schedule with zero safety incidents.",
          "Net profit margin increased by 4.2% through streamlined material sourcing."
        ],
        risks: [
          "Stavební povolení for 1 key project expiring on Sept 18 requires immediate administrative renewal.",
          "Material price volatility on oak timber frames (+6% QoQ)."
        ],
        revenue: "2,450,000 CZK (Gross) • 680,000 CZK (Net Profit)",
        actions: [
          "Approve renewal submission for MěÚ Třinec building permit.",
          "Re-allocate 2 technicians to the Ostrava region to balance workload capacity."
        ]
      });
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-16 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Finanční analýzy & výkonnost staveb</h2>
          <p className="text-xs text-slate-500">Interaktivní marže projektů, ziskovost řemeslných part a manažerské AI reporty pro {branding.name}</p>
        </div>

        <button
          onClick={handleGenerateExecutiveReport}
          disabled={isGeneratingReport}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-all flex items-center gap-2"
        >
          <Sparkles className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
          <span>{isGeneratingReport ? 'Generování manažerského reportu...' : 'Generovat týdenní manažerský report'}</span>
        </button>
      </div>

      {/* AI Executive Report Modal / Banner */}
      {executiveReport && (
        <div className="bg-white text-slate-900 p-8 rounded-3xl border border-amber-500/40 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Týdenní manažerský přehled vedení firmy</h3>
                <p className="text-xs text-amber-400">{executiveReport.period} • Zpracováno AI modelem z firemních dat</p>
              </div>
            </div>
            <button onClick={() => setExecutiveReport(null)} className="text-slate-500 hover:text-slate-900 font-bold text-sm">✕ Zavřít</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Wins */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-green-400 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Hlavní úspěchy tohoto týdne
              </h4>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">•</span>
                  <span>Rekordní konverze poptávek (42.8 %) díky okamžité kalkulaci a rychlé reakci.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">•</span>
                  <span>Dokončeno 14 zakázek v přesném harmonogramu bez překročení rozpočtu.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">•</span>
                  <span>Zvýšení čisté marže o 4.2 % díky optimalizaci nákupu stavebního řeziva.</span>
                </li>
              </ul>
            </div>

            {/* Risks */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                <ShieldAlert className="w-4 h-4" /> Rizika a úzká hrdla
              </h4>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Stavební povolení pro klíčovou zakázku v Třinci vyprší 18. září – nutno podat prodloužení.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Predikovaný déšť ve čtvrtek ovlivní pokládku střech – přesunout na pátek.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Revenue Overview */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                <DollarSign className="w-4 h-4" /> Finanční shrnutí týdne
              </h4>
              <p className="text-base font-extrabold text-slate-900 mt-1">2 450 000 Kč (Obrat) • 680 000 Kč (Čistý zisk)</p>
              <p className="text-slate-500 text-[11px]">Stabilní meziměsíční růst o +18.4 % v realizacích s vyšší přidanou hodnotou.</p>
            </div>

            {/* Recommended Actions */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4" /> Doporučené kroky pro vedení
              </h4>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">1.</span>
                  <span>Schválit žádost o prodloužení stavebního povolení pro MěÚ Třinec.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">2.</span>
                  <span>Přesunout 2 řemeslníky na severomoravské zakázky pro vyrovnání kapacit.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Průměrná doba realizace</span>
          <p className="text-3xl font-extrabold text-slate-900">14.2 <span className="text-sm font-medium text-slate-500">dní</span></p>
          <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Zkráceno o 3.4 dne oproti Q2</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Úspěšnost uzavření poptávek</span>
          <p className="text-3xl font-extrabold text-slate-900">42.8%</p>
          <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+12.1% díky rychlé nabídce</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Rychlost reakce na poptávku</span>
          <p className="text-3xl font-extrabold text-slate-900">18.4 <span className="text-sm font-medium text-slate-500">min</span></p>
          <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Zlepšení o 35%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Spokojenost investorů</span>
          <p className="text-3xl font-extrabold text-slate-900">4.9 <span className="text-sm font-medium text-amber-500">★</span></p>
          <div className="flex items-center gap-1 text-xs font-semibold text-green-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>98.2% kladných hodnocení</span>
          </div>
        </div>
      </div>

      {/* Detailed Analytics Grid: Profit by Technician & Profit by Service */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profit by Technician */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Přínos a marže dle vedoucích part</span>
            <span className="text-xs text-slate-500 font-normal">Q3 2026</span>
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Petr Novotný', profit: '840 000 Kč', margin: '38%', jobs: 12 },
              { name: 'Martin Kovář', profit: '690 000 Kč', margin: '36%', jobs: 10 },
              { name: 'Tomáš Veselý', profit: '520 000 Kč', margin: '34%', jobs: 8 },
              { name: 'Jan Horák', profit: '410 000 Kč', margin: '31%', jobs: 6 }
            ].map((tech, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{tech.name}</h4>
                  <p className="text-[11px] text-slate-500">{tech.jobs} dokončených staveb • marže {tech.margin}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-amber-400 font-mono">{tech.profit}</p>
                  <span className="text-[10px] font-semibold text-slate-500">Čistý přínos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit by Service */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Ziskovost dle typu stavebních prací</span>
            <span className="text-xs text-slate-500 font-normal">Analýza marží</span>
          </h3>
          <div className="space-y-3">
            {[
              { service: 'Dřevěné pergoly a zastřešení na míru', revenue: '1.4M Kč', profit: '540 000 Kč', margin: '42%' },
              { service: 'Ocelové přístřešky pro auta', revenue: '1.8M Kč', profit: '620 000 Kč', margin: '38%' },
              { service: 'Tesařské a krovové konstrukce', revenue: '950 tis. Kč', profit: '310 000 Kč', margin: '32%' },
              { service: 'Rekonstrukce a zateplení střech', revenue: '780 tis. Kč', profit: '240 000 Kč', margin: '30%' }
            ].map((srv, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{srv.service}</h4>
                  <p className="text-[11px] text-slate-500">Objem zakázek: {srv.revenue}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-amber-400 font-mono">{srv.profit}</p>
                  <span className="text-[10px] font-bold text-green-400 bg-green-950/80 border border-green-800 px-2 py-0.5 rounded">{srv.margin} Marže</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

