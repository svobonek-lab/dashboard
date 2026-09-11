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
  MessageSquare,
  BarChart3,
  PieChart,
  Camera,
  Star,
  Zap,
  MapPin,
  FileText,
  UserCheck,
  Check,
  Percent,
  Timer
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
    "Doporučení: Kontaktujte investora Pavla do 30 min pro uzavření rozpočtu na 320 tis. Kč.",
    "Optimalizace trasy ušetřila dnes partě tesařů 42 minut přejezdů.",
    "Ing. Jan Svoboda nahrál nové fotografie zaměření — připraveno ke schválení.",
    "Jan Richter dosáhl 95% kapacity; nové zakázky dispečink směruje na Petra Novotného."
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
  const inProgressCount = leads.filter(l => l.status === 'In Progress').length;
  const quoteCount = leads.filter(l => l.status === 'Quote').length;
  const completedCount = leads.filter(l => l.status === 'Completed').length;

  return (
    <div className="space-y-8 pb-24 relative text-slate-900">
      
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
              Executive OS Panel
            </span>
            <span className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Řídicí panel majitele
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kompletní operační přehled a dispečink zakázek • <span className="font-bold text-blue-600">{branding.name}</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('quotes')}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Vytvořit nabídku</span>
          </button>
          
          <button
            onClick={() => onNavigateTab('employees')}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Přidat zaměstnance</span>
          </button>

          <button
            onClick={() => onNavigateTab('calendar')}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Harmonogram</span>
          </button>

          <button
            onClick={() => onNavigateTab('leads')}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all hover:shadow-lg flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Nová zakázka</span>
          </button>
        </div>
      </div>

      {/* Top Wins / Milestone Banner */}
      <div className="bg-white p-7 rounded-3xl text-slate-800 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Ranní rekapitulace & Dispečink</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              3 zálohy připsány na účet & naplánováno 5 montáží na tento týden
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl">
              Automatický dispečink a zachycování poptávek přes portál zajistily dnes dopoledne v lokalitě {branding.city} hladký start stavebních etap.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button

              onClick={() => onNavigateTab('analytics')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <span>Finanční forecast & marže</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Revenue & Forecast */}
        <div 
          onClick={() => onNavigateTab('analytics')}
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-blue-400 transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Obrat & Tržby (Q3)</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">
              {((totalRevenue + 245000) / 1000).toFixed(0)} <span className="text-xs font-medium text-slate-500">tis. Kč</span>
            </p>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+24.5% forecast do konce měsíce</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pipeline Funnel / Active Jobs */}
        <div 
          onClick={() => onNavigateTab('leads')}
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pipeline & Poptávky</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">{leads.length} <span className="text-xs font-medium text-slate-500">zakázek</span></p>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-indigo-600">
              <span>{newLeadsCount} nových • {quoteCount} v nabídce • {inProgressCount} na stavbě</span>
            </div>
          </div>
        </div>

        {/* Card 3: Response Time SLA */}
        <div 
          onClick={() => onNavigateTab('communication')}
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reakční doba SLA</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">18 <span className="text-xs font-medium text-slate-500">minut</span></p>
            <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600">
              <Check className="w-3.5 h-3.5" />
              <span>94% odpovědí do 30 min (AI auto-reply)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Win Rate & Google Rating */}
        <div 
          onClick={() => onNavigateTab('analytics')}
          className="bg-white p-5 rounded-3xl border border-slate-200 hover:border-amber-400 transition-all cursor-pointer shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Úspěšnost & Hodnocení</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">76% <span className="text-xs font-medium text-slate-500">konverze</span></p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-amber-600">
              <span>Google Reviews: 4.9 ★ (48 recenzí)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Team Capacity Heatmap & Planned Site Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Team Capacity & Workload Heatmap */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Vytížení týmu & Dispečink
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              Průměr 82%
            </span>
          </div>

          <p className="text-xs text-slate-500">Aktuální alokace řemeslníků na dnešní směnu:</p>

          <div className="space-y-3 pt-1">
            {[
              { name: 'Petr Novotný', role: 'Mistr tesař', load: 85, task: 'Pergola Zahradní (Brno)' },
              { name: 'Martin Kovář', role: 'Střechy & Krovy', load: 95, task: 'Oprava střechy RD' },
              { name: 'Tomáš Kučera', role: 'Zámečník & Hliník', load: 60, task: 'Příprava profilů sklad' },
              { name: 'Marek Dvořák', role: 'Elektromontáže', load: 45, task: 'Zapojení Somfy motorů' }
            ].map((emp, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{emp.name}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({emp.role})</span>
                  </div>
                  <span className={`font-mono font-bold text-[11px] ${
                    emp.load > 85 ? 'text-rose-600' : emp.load > 60 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {emp.load}%
                  </span>
                </div>
                
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      emp.load > 85 ? 'bg-rose-500' : emp.load > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} 
                    style={{ width: `${emp.load}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Úkol: {emp.task}</span>
                  <span className="text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => onNavigateTab('employees')}>
                    Přiřadit →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planned Site Visits & Surveys */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Plánované výjezdy & Zaměření
            </h3>
            <button 
              onClick={() => onNavigateTab('calendar')}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Zobrazit vše →
            </button>
          </div>

          <p className="text-xs text-slate-500">Nejbližší osobní schůzky s investory:</p>

          <div className="space-y-2.5">
            {[
              { time: 'Dnes 13:30', client: 'Ing. Jan Svoboda', type: 'Zaměření pergoly 6x4m', addr: `Zahradní 14, ${branding.city}`, status: 'Potvrzeno SMS' },
              { time: 'Dnes 16:00', client: 'Marta Dvořáková', type: 'Konzultace podlahy', addr: `Lipová 88, ${branding.city}`, status: 'Připraven vzorník' },
              { time: 'Zítra 09:00', client: 'Radim Procházka', type: 'Předání hotové střechy', addr: `Sluneční 312, ${branding.city}`, status: 'Podpis protokolu' }
            ].map((visit, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 hover:border-blue-200 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                    {visit.time}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600">{visit.status}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{visit.client} — {visit.type}</h4>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {visit.addr}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Sources Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-500" />
              Zdroje poptávek (Tento měsíc)
            </h3>
            <span className="text-[10px] font-bold text-slate-500">Celkem 28</span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { source: 'Embed Widget na webu', count: 14, pct: 50, color: 'bg-amber-500' },
              { source: 'Doporučení od klientů', count: 8, pct: 28, color: 'bg-emerald-500' },
              { source: 'Google & Organické vyhledávání', count: 4, pct: 15, color: 'bg-blue-500' },
              { source: 'Reklama & Sociální sítě', count: 2, pct: 7, color: 'bg-purple-500' }
            ].map((src, i) => (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">{src.source}</span>
                  <span className="font-mono font-bold text-slate-900">{src.count} ({src.pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div className={`h-full ${src.color}`} style={{ width: `${src.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 3: Live Real-Time Feed & Recent Construction Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Activity Feed (2 cols) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Živý přehled ze staveb (Real-time deník)
            </h3>
            <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live synchronizace
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { time: '09:42', text: 'Petr Novotný dorazil na stavbu (Zahradní 12 - zahájení kotvení patek)', color: 'border-amber-200 text-amber-700 bg-amber-50' },
              { time: '10:15', text: 'Investor Ing. Jan Svoboda nahrál 2 fotografie před montáží do klientského portálu', color: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
              { time: '11:06', text: 'Rozpočet POL-2026-0492 odsouhlasen & uhrazena záloha na materiál (220 tis. Kč)', color: 'border-blue-200 text-blue-700 bg-blue-50' },
              { time: '11:22', text: 'AI Dispatcher přiřadil novou poptávku na tesařské práce mistru Petrovi', color: 'border-purple-200 text-purple-700 bg-purple-50' },
              { time: '11:40', text: 'Zákazník Marta Dvořáková podepsal předávací protokol na dotykovém tabletu', color: 'border-emerald-200 text-emerald-700 bg-emerald-50' }
            ].map((act, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border ${act.color} flex-shrink-0`}>
                  {act.time}
                </span>
                <p className="text-xs font-medium text-slate-700 flex-1">{act.text}</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Construction Photos */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-500" />
              Nedávné fotky ze staveb
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">Dnes (3 nové)</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { title: 'Nosná konstrukce pergoly', time: '10:15', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400' },
              { title: 'Tesařský krov střechy', time: '09:30', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f2445?auto=format&fit=crop&w=400' },
              { title: 'Finální montáž lamel', time: 'Včera', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400' },
              { title: 'Základové betonové patky', time: 'Včera', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400' }
            ].map((photo, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200 group aspect-video">
                <img src={photo.url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-2">
                  <span className="text-[10px] font-bold text-white truncate shadow-sm">{photo.title}</span>
                  <span className="text-[9px] text-slate-200 font-mono drop-shadow-md">{photo.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Floating AI Insight Card */}
      <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-white border border-blue-200 p-4 rounded-2xl shadow-xl text-slate-800 flex items-start gap-3 bg-opacity-95 backdrop-blur-md">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Asistent stavby (AI)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {aiInsights[aiInsightIndex]}
          </p>
        </div>
      </div>

    </div>
  );
};
