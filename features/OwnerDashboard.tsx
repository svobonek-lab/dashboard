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
  Timer,
  Activity,
  HardHat
} from 'lucide-react';
import { CompanyBranding, Lead } from '../types';
import { useBranding } from '@/hooks/useBranding';

interface OwnerDashboardProps {
  branding: CompanyBranding;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateTab: (tab: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  branding: propBranding,
  leads,
  onSelectLead,
  onNavigateTab
}) => {
  const { branding, palette, brandStyles } = useBranding();
  const [aiInsightIndex, setAiInsightIndex] = useState(0);

  const activeCompanyName = branding.name || propBranding.name || 'Vaše Stavební Firma';

  const aiInsights = [
    `Doporučení: Kontaktujte investora Pavla do 30 min pro uzavření rozpočtu na 320 tis. Kč.`,
    `Optimalizace trasy ušetřila dnes partě tesařů firmy ${activeCompanyName} 42 minut přejezdů.`,
    `Ing. Jan Svoboda nahrál nové fotografie zaměření — připraveno ke schválení v portálu.`,
    `Jan Richter dosáhl 95% kapacity; nové zakázky dispečink směruje na Petra Novotného.`
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setAiInsightIndex(prev => (prev + 1) % aiInsights.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [aiInsights.length]);

  const totalRevenue = leads
    .filter(l => l.status === 'Completed' || l.status === 'In Progress')
    .reduce((acc, l) => acc + l.price, 0);

  const newLeadsCount = leads.filter(l => l.status === 'New').length;
  const inProgressCount = leads.filter(l => l.status === 'In Progress').length;
  const quoteCount = leads.filter(l => l.status === 'Quote').length;
  const completedCount = leads.filter(l => l.status === 'Completed').length;

  return (
    <div className="space-y-8 pb-24 relative text-slate-900 font-sans">
      
      {/* Dynamic Brand Hero Section */}
      <div 
        className="p-8 rounded-[28px] border shadow-sm relative overflow-hidden transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, #FFFFFF 0%, ${palette.primarySubtle} 60%, ${palette.primaryLight} 100%)`,
          borderColor: palette.primaryBorder,
          boxShadow: `0 8px 30px -6px rgba(15, 23, 42, 0.05)`
        }}
      >
        <div 
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: palette.primary }}
        ></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span 
                className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5"
                style={{
                  backgroundColor: palette.primaryLight,
                  color: palette.primary,
                  border: `1px solid ${palette.primaryBorder}`
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Operační Systém</span>
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Vítejte zpět, <span style={{ color: palette.primary }}>{activeCompanyName}</span>
            </h1>

            <p className="text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">
              Dnes máte <strong className="text-slate-900 font-bold">{inProgressCount} aktivních projektů</strong> ve výstavbě a <strong className="text-slate-900 font-bold">{newLeadsCount} nových poptávek</strong> čekajících na zpracování rozpočtu.
            </p>
          </div>

          {/* Quick Actions with company palette */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateTab('quotes')}
              className="px-4 py-3 rounded-2xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-sm transition-all flex items-center gap-2 hover:border-slate-300 active:scale-[0.98]"
            >
              <FileText className="w-4 h-4" style={{ color: palette.primary }} />
              <span>Vytvořit nabídku</span>
            </button>
            
            <button
              onClick={() => onNavigateTab('leads')}
              style={{
                backgroundColor: palette.primary,
                color: palette.textOnPrimary,
                boxShadow: palette.primaryGlow
              }}
              className="px-5 py-3 rounded-2xl text-xs font-black transition-all shadow-lg flex items-center gap-2 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Nová zakázka</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Main Executive Glassmorphic Metric Cards with Top-Border Glow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Revenue & Forecast */}
        <div 
          onClick={() => onNavigateTab('analytics')}
          className="bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer shadow-sm hover:shadow-lg group relative overflow-hidden"
          style={{
            borderTop: `4px solid ${palette.primary}`,
            boxShadow: `0 4px 20px -2px rgba(15, 23, 42, 0.05)`
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Obrat & Tržby (Q3)</span>
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{
                backgroundColor: palette.primarySubtle,
                color: palette.primary
              }}
            >
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {((totalRevenue + 245000) / 1000).toFixed(0)} <span className="text-sm font-bold text-slate-500">tis. Kč</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-green-600">
              <ArrowUpRight className="w-4 h-4" />
              <span>+24.5% forecast do konce měsíce</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pipeline Funnel / Active Jobs */}
        <div 
          onClick={() => onNavigateTab('leads')}
          className="bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer shadow-sm hover:shadow-lg group relative overflow-hidden"
          style={{
            borderTop: `4px solid ${palette.secondary}`,
            boxShadow: `0 4px 20px -2px rgba(15, 23, 42, 0.05)`
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pipeline & Poptávky</span>
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{
                backgroundColor: palette.secondaryLight,
                color: palette.secondary
              }}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {leads.length} <span className="text-sm font-bold text-slate-500">zakázek</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold" style={{ color: palette.secondary }}>
              <span>{newLeadsCount} nových • {quoteCount} v nabídce • {inProgressCount} na stavbě</span>
            </div>
          </div>
        </div>

        {/* Card 3: Response Time SLA */}
        <div 
          onClick={() => onNavigateTab('communication')}
          className="bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer shadow-sm hover:shadow-lg group relative overflow-hidden"
          style={{
            borderTop: `4px solid #10B981`,
            boxShadow: `0 4px 20px -2px rgba(15, 23, 42, 0.05)`
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reakční doba SLA</span>
            <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Timer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              18 <span className="text-sm font-bold text-slate-500">minut</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-green-600">
              <Check className="w-4 h-4" />
              <span>94% odpovědí do 30 min (AI auto-reply)</span>
            </div>
          </div>
        </div>

        {/* Card 4: Win Rate & Google Rating */}
        <div 
          onClick={() => onNavigateTab('analytics')}
          className="bg-white/90 backdrop-blur-md p-6 rounded-[24px] border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer shadow-sm hover:shadow-lg group relative overflow-hidden"
          style={{
            borderTop: `4px solid ${palette.primary}`,
            boxShadow: `0 4px 20px -2px rgba(15, 23, 42, 0.05)`
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Úspěšnost & Hodnocení</span>
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{
                backgroundColor: palette.primarySubtle,
                color: palette.primary
              }}
            >
              <Star className="w-5 h-5 fill-current" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              76% <span className="text-sm font-bold text-slate-500">konverze</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold" style={{ color: palette.primary }}>
              <span>Google Reviews: 4.9 ★ (48 recenzí)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Team Capacity Heatmap & Planned Site Visits & Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Team Capacity & Workload Heatmap */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: palette.primary }} />
              Vytížení týmu & Dispečink
            </h3>
            <span 
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: palette.primarySubtle,
                color: palette.primary,
                border: `1px solid ${palette.primaryBorder}`
              }}
            >
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
                  <span className="font-mono font-bold text-[11px]" style={{ color: palette.primary }}>
                    {emp.load}%
                  </span>
                </div>
                
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all" 
                    style={{ width: `${emp.load}%`, backgroundColor: palette.primary }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Úkol: {emp.task}</span>
                  <span 
                    className="font-bold cursor-pointer hover:underline" 
                    style={{ color: palette.primary }}
                    onClick={() => onNavigateTab('employees')}
                  >
                    Přiřadit →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Planned Site Visits & Surveys */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: palette.primary }} />
              Plánované výjezdy & Zaměření
            </h3>
            <button 
              onClick={() => onNavigateTab('calendar')}
              className="text-[10px] font-bold hover:underline"
              style={{ color: palette.primary }}
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
              <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 hover:border-slate-300 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <span 
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: palette.primaryLight,
                      color: palette.primary,
                      borderColor: palette.primaryBorder
                    }}
                  >
                    {visit.time}
                  </span>
                  <span className="text-[10px] font-semibold text-green-600">{visit.status}</span>
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
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4" style={{ color: palette.secondary }} />
              Zdroje poptávek (Tento měsíc)
            </h3>
            <span className="text-[10px] font-bold text-slate-500">Celkem 28</span>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { source: `Embed Widget na webu ${activeCompanyName}`, count: 14, pct: 50, color: palette.primary },
              { source: 'Doporučení od stávajících klientů', count: 8, pct: 28, color: '#10B981' },
              { source: 'Google & Organické vyhledávání', count: 4, pct: 15, color: palette.secondary },
              { source: 'Sociální sítě & Reklama', count: 2, pct: 7, color: '#8B5CF6' }
            ].map((src, i) => (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">{src.source}</span>
                  <span className="font-mono font-bold text-slate-900">{src.count} ({src.pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                  <div className="h-full" style={{ width: `${src.pct}%`, backgroundColor: src.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 3: Live Real-Time Feed & Recent Construction Photos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Activity Feed (2 cols) */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: palette.primary }} />
              Živý přehled ze staveb (Real-time deník)
            </h3>
            <span 
              className="text-[10px] font-bold flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                backgroundColor: palette.primarySubtle,
                color: palette.primary,
                border: `1px solid ${palette.primaryBorder}`
              }}
            >
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: palette.primary }}></span>
              Live synchronizace
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { time: '09:42', text: 'Petr Novotný dorazil na stavbu (Zahradní 12 - zahájení kotvení patek)', badgeColor: palette.primaryLight, textColor: palette.primary },
              { time: '10:15', text: 'Investor Ing. Jan Svoboda nahrál 2 fotografie před montáží do klientského portálu', badgeColor: '#D1FAE5', textColor: '#065F46' },
              { time: '11:06', text: 'Rozpočet POL-2026-0492 odsouhlasen & uhrazena záloha na materiál (220 tis. Kč)', badgeColor: palette.secondaryLight, textColor: palette.secondary },
              { time: '11:22', text: `AI Dispatcher přiřadil novou poptávku z webu ${activeCompanyName} mistru Petrovi`, badgeColor: '#EDE9FE', textColor: '#5B21B6' },
              { time: '11:40', text: 'Zákazník Marta Dvořáková podepsal předávací protokol na dotykovém tabletu', badgeColor: '#D1FAE5', textColor: '#065F46' }
            ].map((act, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <span 
                  className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold flex-shrink-0"
                  style={{
                    backgroundColor: act.badgeColor,
                    color: act.textColor
                  }}
                >
                  {act.time}
                </span>
                <p className="text-xs font-medium text-slate-700 flex-1">{act.text}</p>
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Construction Photos */}
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-500" />
              Nedávné fotky ze staveb
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold">Dnes (3 nové)</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { title: 'Nosná konstrukce', time: '10:15', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400' },
              { title: 'Tesařský krov', time: '09:30', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f2445?auto=format&fit=crop&w=400' },
              { title: 'Finální montáž', time: 'Včera', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400' },
              { title: 'Betonové patky', time: 'Včera', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400' }
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

      {/* Floating AI Insight Card with dynamic branding */}
      <div 
        className="fixed bottom-6 right-6 z-40 max-w-sm bg-white/95 backdrop-blur-md border p-4 rounded-2xl shadow-2xl text-slate-800 flex items-start gap-3"
        style={{ borderColor: palette.primaryBorder }}
      >
        <div 
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: palette.primarySubtle, color: palette.primary }}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: palette.primary }}>
              Asistent stavby (AI)
            </span>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: palette.primary }}></span>
          </div>
          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {aiInsights[aiInsightIndex]}
          </p>
        </div>
      </div>

    </div>
  );
};

