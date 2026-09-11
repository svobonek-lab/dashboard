import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Plus,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CloudRain,
  ShieldAlert,
  ArrowRight,
  Phone,
  MessageSquare
} from 'lucide-react';
import { CompanyBranding, Lead } from '../types';

interface OwnerDashboardProps {
  branding: CompanyBranding;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateTab: (tab: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  branding,
  leads,
  onSelectLead,
  onNavigateTab
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [aiInsightIndex, setAiInsightIndex] = useState(0);

  const aiInsights = [
    "Call Pavel within 30 minutes to secure the 320k CZK quote.",
    "Today's route optimization saves 42 minutes of transit time.",
    "Ing. Jan Svoboda uploaded photos — ready for instant quote generation.",
    "Jan Richter reached 100% capacity; reassigning new leads to Petr."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setAiInsightIndex(prev => (prev + 1) % aiInsights.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const totalRevenue = leads
    .filter(l => l.status === 'Completed' || l.status === 'In Progress')
    .reduce((acc, l) => acc + l.price, 0);

  const newLeadsCount = leads.filter(l => l.status === 'New').length;
  const waitingQuotesCount = leads.filter(l => l.status === 'Quote').length;

  return (
    <div className="space-y-8 pb-24 relative text-slate-100">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-100 tracking-tight">
            Dobré ráno, Jane. 👋
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Dnešní přehled & manažerský panel zakázek • <span className="font-semibold text-amber-400">{branding.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('quotes')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 shadow-xs transition-all"
          >
            Vytvořit rozpočet (PDF)
          </button>
          <button
            onClick={() => onNavigateTab('leads')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 shadow-md transition-all hover:opacity-95 flex items-center gap-2 bg-amber-500 hover:bg-amber-400"
          >
            <Plus className="w-4 h-4" />
            <span>Nová zakázka / poptávka</span>
          </button>
        </div>
      </div>

      {/* Top Section: Today’s Wins Banner */}
      <div className="bg-slate-900 p-7 rounded-3xl text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Dnešní milníky & přehled staveb</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              3 nové zálohy připsány na účet & optimalizováno 42 minut přejezdů party
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Automatický dispečink a zachycování poptávek přes portál zajistily dnes dopoledne v lokalitě {branding.city} hladký start stavebních etap.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('analytics')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <span>Finanční ukazatele staveb</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Clickable Actionable Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Saved Leads Today */}
        <div 
          onClick={() => {
            setExpandedCard(expandedCard === 'leads' ? null : 'leads');
            onNavigateTab('leads');
          }}
          className={`bg-slate-900 p-6 rounded-3xl border transition-all cursor-pointer shadow-md hover:shadow-lg group ${
            expandedCard === 'leads' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nové zakázky</span>
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-100">{newLeadsCount + 3}</p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+3 z webového formuláře</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Zobrazit <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Revenue Generated Today */}
        <div 
          onClick={() => {
            setExpandedCard(expandedCard === 'revenue' ? null : 'revenue');
            onNavigateTab('analytics');
          }}
          className={`bg-slate-900 p-6 rounded-3xl border transition-all cursor-pointer shadow-md hover:shadow-lg group ${
            expandedCard === 'revenue' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fakturace & Zálohy</span>
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-100">
                {((totalRevenue + 145000) / 1000).toFixed(0)} <span className="text-sm font-medium text-slate-400">tis. Kč</span>
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+24.5% oproti měsíčnímu plánu</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Detail <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 3: AI Time Saved */}
        <div 
          onClick={() => {
            setExpandedCard(expandedCard === 'time' ? null : 'time');
          }}
          className={`bg-slate-900 p-6 rounded-3xl border transition-all cursor-pointer shadow-md hover:shadow-lg group ${
            expandedCard === 'time' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ušetřený čas mistrů</span>
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-100">34.5 <span className="text-sm font-medium text-slate-400">hod</span></p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Digitální stavební deník & PDF</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Záznamy <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Urgent Jobs */}
        <div 
          onClick={() => {
            setExpandedCard(expandedCard === 'urgent' ? null : 'urgent');
            onNavigateTab('calendar');
          }}
          className={`bg-slate-900 p-6 rounded-3xl border transition-all cursor-pointer shadow-md hover:shadow-lg group ${
            expandedCard === 'urgent' ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-lg' : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Akutní zásahy</span>
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-100">2 <span className="text-sm font-medium text-slate-400">stavby</span></p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Čeká na schválení materiálu</span>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Dispečink <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Needs Attention & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Panel */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              Vyžaduje pozornost
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 border border-rose-800 text-rose-400">3 položky</span>
          </div>

          <p className="text-xs text-slate-400">Úkoly a zakázky vyžadující dnešní rozhodnutí vedení:</p>

          <div className="space-y-3">
            {/* Overdue Lead */}
            <div 
              onClick={() => onNavigateTab('leads')}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Zpožděná nabídka</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950 text-rose-400 border border-rose-800">3 dny bez reakce</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Ing. Jan Svoboda — Rekonstrukce rodinného domu v {branding.city}</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-amber-400 font-semibold">
                <span>Akce: Zavolat investorovi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Unanswered Customer */}
            <div 
              onClick={() => onNavigateTab('leads')}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Dotaz na materiál</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950 text-amber-400 border border-amber-800">Čeká 4h</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Marta Dvořáková zaslala dotaz k typu dlažby na terase.</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-amber-400 font-semibold">
                <span>Akce: Odpovědět přes WhatsApp / SMS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quote Expiring */}
            <div 
              onClick={() => onNavigateTab('quotes')}
              className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Vypršení platnosti rozpočtu</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">Končí dnes</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Rozpočet POL-2026-0492 (220 000 Kč) čeká na podpis smlouvy o dílo.</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-amber-400 font-semibold">
                <span>Akce: Odeslat výzvu k podpisu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Feed (Right Side) */}
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-md lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Živý přehled ze staveb (Real-time deník)
            </h3>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live synchronizace
            </span>
          </div>

          <p className="text-xs text-slate-400">Aktualizace ze staveb a hlášení mistrů v reálném čase ({branding.name}):</p>

          <div className="space-y-3">
            {[
              { time: '09:42', text: 'Petr Novotný dorazil na stavbu (Zahradní 12, Brno - zahájení betonáže)', type: 'arrival', color: 'bg-slate-800 text-amber-400 border-slate-700' },
              { time: '10:11', text: 'Investor Ing. Jan Svoboda nahrál 2 fotografie před započetím bouracích prací', type: 'photo', color: 'bg-slate-800 text-emerald-400 border-slate-700' },
              { time: '11:06', text: 'Rozpočet POL-2026-0492 odsouhlasen & uhrazena záloha na materiál (220 tis. Kč)', type: 'quote', color: 'bg-slate-800 text-cyan-400 border-slate-700' },
              { time: '11:22', text: 'Dispečink automaticky přiřadil partu zedníků podle dojezdové vzdálenosti', type: 'ai', color: 'bg-slate-800 text-purple-400 border-slate-700' },
              { time: '11:35', text: 'Bankovní párování: 145 000 Kč připsáno na účet (faktura doplatku etapy 1)', type: 'payment', color: 'bg-slate-800 text-emerald-400 border-slate-700' }
            ].map((act, i) => (
              <div key={i} className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${act.color} flex-shrink-0`}>
                  {act.time}
                </span>
                <p className="text-xs font-medium text-slate-300 flex-1">{act.text}</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI Insight Card (Bottom-Right with subtle animation) */}
      <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-slate-900 border border-amber-500/40 p-4 rounded-2xl shadow-2xl text-white flex items-start gap-3 backdrop-blur-md bg-opacity-95">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Asistent stavby (AI)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {aiInsights[aiInsightIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};
