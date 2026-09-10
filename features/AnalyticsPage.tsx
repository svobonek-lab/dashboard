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
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Performance Intelligence</h2>
          <p className="text-xs text-slate-500">Interactive financial insights, technician profitability, and AI executive reports for {branding.name}</p>
        </div>

        <button
          onClick={handleGenerateExecutiveReport}
          disabled={isGeneratingReport}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2"
        >
          <Sparkles className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
          <span>{isGeneratingReport ? 'Generating CEO Report...' : 'Generate AI Executive Report'}</span>
        </button>
      </div>

      {/* AI Executive Report Modal / Banner */}
      {executiveReport && (
        <div className="bg-slate-900 text-white p-8 rounded-3xl border border-blue-500/40 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{executiveReport.title}</h3>
                <p className="text-xs text-blue-300">{executiveReport.period} • Generated via Gemini AI</p>
              </div>
            </div>
            <button onClick={() => setExecutiveReport(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Wins */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Key Wins This Week
              </h4>
              <ul className="space-y-2 text-slate-300">
                {executiveReport.wins.map((w: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                <ShieldAlert className="w-4 h-4" /> Risks & Bottlenecks
              </h4>
              <ul className="space-y-2 text-slate-300">
                {executiveReport.risks.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Revenue Overview */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-blue-400 flex items-center gap-1.5 text-sm">
                <DollarSign className="w-4 h-4" /> Financial Summary
              </h4>
              <p className="text-base font-extrabold text-white mt-1">{executiveReport.revenue}</p>
              <p className="text-slate-400 text-[11px]">Consistent month-over-month growth of +18.4% in high-margin construction contracts.</p>
            </div>

            {/* Recommended Actions */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-purple-400 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4" /> CEO Action Plan
              </h4>
              <ul className="space-y-2 text-slate-300">
                {executiveReport.actions.map((a: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">1.</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Core KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Average Completion Time</span>
          <p className="text-3xl font-extrabold text-slate-900">14.2 <span className="text-sm font-medium text-slate-500">days</span></p>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>-3.4 days vs last quarter</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Lead Conversion Rate</span>
          <p className="text-3xl font-extrabold text-slate-900">42.8%</p>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+12.1% via AI widget</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Avg Response Time Trend</span>
          <p className="text-3xl font-extrabold text-slate-900">18.4 <span className="text-sm font-medium text-slate-500">min</span></p>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Improved by 35%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <span className="text-xs font-semibold text-slate-500 uppercase">Customer Satisfaction</span>
          <p className="text-3xl font-extrabold text-slate-900">4.9 <span className="text-sm font-medium text-amber-500">★</span></p>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>98.2% positive reviews</span>
          </div>
        </div>
      </div>

      {/* Detailed Analytics Grid: Profit by Technician & Profit by Service */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profit by Technician */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Profit by Technician</span>
            <span className="text-xs text-slate-400 font-normal">Q3 2026</span>
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Petr Novotný', profit: '840,000 CZK', margin: '38%', jobs: 12 },
              { name: 'Martin Kovář', profit: '690,000 CZK', margin: '36%', jobs: 10 },
              { name: 'Tomáš Veselý', profit: '520,000 CZK', margin: '34%', jobs: 8 },
              { name: 'Jan Horák', profit: '410,000 CZK', margin: '31%', jobs: 6 }
            ].map((tech, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{tech.name}</h4>
                  <p className="text-[11px] text-slate-500">{tech.jobs} completed jobs • {tech.margin} margin</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-emerald-700">{tech.profit}</p>
                  <span className="text-[10px] font-semibold text-slate-400">Net Contribution</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit by Service */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span>Profitability by Service Type</span>
            <span className="text-xs text-slate-400 font-normal">Margin Analysis</span>
          </h3>
          <div className="space-y-3">
            {[
              { service: 'Dřevěné Pergoly & Zastřešení', revenue: '1.4M CZK', profit: '540,000 CZK', margin: '42%' },
              { service: 'Ocelové Přístřešky na auta', revenue: '1.8M CZK', profit: '620,000 CZK', margin: '38%' },
              { service: 'Kompletní Tesařské práce', revenue: '950,000 CZK', profit: '310,000 CZK', margin: '32%' },
              { service: 'Střešní Renovace', revenue: '780,000 CZK', profit: '240,000 CZK', margin: '30%' }
            ].map((srv, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{srv.service}</h4>
                  <p className="text-[11px] text-slate-500">Total Volume: {srv.revenue}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-blue-700">{srv.profit}</p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{srv.margin} Margin</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

