import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Clock, ArrowUpRight, Sparkles, CheckCircle2, ShieldAlert, DollarSign, Star, FileText } from 'lucide-react';
import { CompanyBranding } from '../types';

interface AnalyticsPageProps {
  branding: CompanyBranding;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ branding }) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [executiveReport, setExecutiveReport] = useState<any | null>(null);

  const activeColor = branding.primaryColor || '#2563eb';

  const handleGenerateExecutiveReport = () => {
    setIsGeneratingReport(true);
    setTimeout(() => {
      setIsGeneratingReport(false);
      setExecutiveReport({
        title: "CEO Weekly Executive Intelligence Report",
        period: "Týden 37, Září 2026",
        wins: [
          "Rekordní konverze poptávek (42.8 %) díky okamžité kalkulaci a rychlé reakci.",
          "Dokončeno 14 zakázek v přesném harmonogramu bez překročení rozpočtu.",
          "Zvýšení čisté marže o 4.2 % díky optimalizaci nákupu stavebního řeziva."
        ],
        risks: [
          "Stavební povolení pro klíčovou zakázku v Třinci vyprší 18. září – nutno podat prodloužení.",
          "Predikovaný déšť ve čtvrtek ovlivní pokládku střech – přesunout na pátek."
        ],
        revenue: "2 450 000 Kč (Obrat) • 680 000 Kč (Čistý zisk)",
        actions: [
          "Schválit žádost o prodloužení stavebního povolení pro MěÚ Třinec.",
          "Přesunout 2 řemeslníky na severomoravské zakázky pro vyrovnání kapacit."
        ]
      });
    }, 1200);
  };

  return (
    <div className="space-y-8 pb-16 text-slate-900 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Finanční analýzy & výkonnost staveb</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Interaktivní marže projektů, ziskovost řemeslných part a manažerské AI reporty pro {branding.name}</p>
        </div>

        <button
          onClick={handleGenerateExecutiveReport}
          disabled={isGeneratingReport}
          className="px-5 py-3 rounded-2xl text-slate-950 text-xs font-bold shadow-lg transition-all flex items-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: activeColor }}
        >
          <Sparkles className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
          <span>{isGeneratingReport ? 'Generování manažerského reportu...' : 'Generovat týdenní manažerský report'}</span>
        </button>
      </div>

      {/* AI Executive Report Modal / Banner */}
      {executiveReport && (
        <div className="bg-white text-slate-900 p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 relative overflow-hidden animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: activeColor }}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Týdenní manažerský přehled vedení firmy</h3>
                <p className="text-xs font-semibold text-slate-500">{executiveReport.period} • Zpracováno AI modelem z firemních dat</p>
              </div>
            </div>
            <button onClick={() => setExecutiveReport(null)} className="text-slate-400 hover:text-slate-900 font-bold text-xs bg-slate-100 px-3 py-1.5 rounded-xl transition-all">✕ Zavřít</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Wins */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold flex items-center gap-1.5 text-sm" style={{ color: activeColor }}>
                <CheckCircle2 className="w-4 h-4" /> Hlavní úspěchy tohoto týdne
              </h4>
              <ul className="space-y-2 text-slate-700">
                {executiveReport.wins.map((w: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold" style={{ color: activeColor }}>•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                <ShieldAlert className="w-4 h-4 text-rose-500" /> Rizika a úzká hrdla
              </h4>
              <ul className="space-y-2 text-slate-700">
                {executiveReport.risks.map((r: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-rose-500">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Revenue Overview */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-bold flex items-center gap-1.5 text-sm" style={{ color: activeColor }}>
                <DollarSign className="w-4 h-4" /> Finanční shrnutí týdne
              </h4>
              <p className="text-base font-extrabold text-slate-900 mt-1">{executiveReport.revenue}</p>
              <p className="text-slate-500 text-[11px]">Stabilní meziměsíční růst o +18.4 % v realizacích s vyšší přidanou hodnotou.</p>
            </div>

            {/* Recommended Actions */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold flex items-center gap-1.5 text-sm" style={{ color: activeColor }}>
                <Sparkles className="w-4 h-4" /> Doporučené kroky pro vedení
              </h4>
              <ul className="space-y-2 text-slate-700">
                {executiveReport.actions.map((act: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold" style={{ color: activeColor }}>{idx + 1}.</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Průměrná doba realizace</span>
          <p className="text-3xl font-black text-slate-900">14.2 <span className="text-sm font-semibold text-slate-500">dní</span></p>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Zkráceno o 3.4 dne oproti Q2</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Úspěšnost uzavření poptávek</span>
          <p className="text-3xl font-black text-slate-900">42.8%</p>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+12.1% díky rychlé nabídce</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rychlost reakce na poptávku</span>
          <p className="text-3xl font-black text-slate-900">18.4 <span className="text-sm font-semibold text-slate-500">min</span></p>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Zlepšení o 35%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Spokojenost investorů</span>
          <p className="text-3xl font-black text-slate-900">4.9 <span className="text-sm font-semibold text-slate-400">★</span></p>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>98.2% kladných hodnocení</span>
          </div>
        </div>
      </div>

      {/* Detailed Analytics Grid: Profit by Technician & Profit by Service */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profit by Technician */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Přínos a marže dle vedoucích part</span>
            <span className="text-xs text-slate-500 font-medium">Q3 2026</span>
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Petr Novotný', profit: '840 000 Kč', margin: '38%', jobs: 12 },
              { name: 'Martin Kovář', profit: '690 000 Kč', margin: '36%', jobs: 10 },
              { name: 'Tomáš Veselý', profit: '520 000 Kč', margin: '34%', jobs: 8 },
              { name: 'Jan Horák', profit: '410 000 Kč', margin: '31%', jobs: 6 }
            ].map((tech, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{tech.name}</h4>
                  <p className="text-[11px] text-slate-500">{tech.jobs} dokončených staveb • marže {tech.margin}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold font-mono" style={{ color: activeColor }}>{tech.profit}</p>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Čistý přínos</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit by Service */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Ziskovost dle typu stavebních prací</span>
            <span className="text-xs text-slate-500 font-medium">Analýza marží</span>
          </h3>
          <div className="space-y-3">
            {[
              { service: 'Dřevěné pergoly a zastřešení na míru', revenue: '1.4M Kč', profit: '540 000 Kč', margin: '42%' },
              { service: 'Ocelové přístřešky pro auta', revenue: '1.8M Kč', profit: '620 000 Kč', margin: '38%' },
              { service: 'Tesařské a krovové konstrukce', revenue: '950 tis. Kč', profit: '310 000 Kč', margin: '32%' },
              { service: 'Rekonstrukce a zateplení střech', revenue: '780 tis. Kč', profit: '240 000 Kč', margin: '30%' }
            ].map((srv, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">{srv.service}</h4>
                  <p className="text-[11px] text-slate-500">Objem zakázek: {srv.revenue}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-xs font-extrabold font-mono" style={{ color: activeColor }}>{srv.profit}</p>
                  <span className="text-[10px] font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded-md">{srv.margin} Marže</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

