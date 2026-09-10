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
    <div className="space-y-8 pb-24 relative">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            Good morning, Jan. 👋
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Today’s Wins & Executive Control Center • <span className="font-semibold text-slate-700">{branding.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('quotes')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition-all"
          >
            Create Quote PDF
          </button>
          <button
            onClick={() => onNavigateTab('leads')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-md transition-all hover:opacity-95 flex items-center gap-2"
            style={{ backgroundColor: branding.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Top Section: Today’s Wins Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-7 rounded-3xl text-white shadow-xl border border-blue-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">Today’s Wins & AI Milestones</span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
              3 new deposits secured & 42 minutes saved in transit today
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Your automated dispatch and WhatsApp lead capture have already converted 3 high-value inquiries this morning in {branding.city}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('analytics')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
            >
              <span>View Financial BI</span>
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
          className={`bg-white p-6 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md group ${
            expandedCard === 'leads' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Leads Today</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{newLeadsCount + 3}</p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+3 new via web widget</span>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Revenue Generated Today */}
        <div 
          onClick={() => {
            setExpandedCard(expandedCard === 'revenue' ? null : 'revenue');
            onNavigateTab('analytics');
          }}
          className={`bg-white p-6 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md group ${
            expandedCard === 'revenue' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Generated Today</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">
                {((totalRevenue + 145000) / 1000).toFixed(0)} <span className="text-sm font-medium text-slate-500">k CZK</span>
              </p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+24.5% vs daily target</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 3: AI Time Saved */}
        <div 
          onClick={() => {
            setExpandedCard(expandedCard === 'time' ? null : 'time');
          }}
          className={`bg-white p-6 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md group ${
            expandedCard === 'time' ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg' : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Time Saved</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">34.5 <span className="text-sm font-medium text-slate-500">hrs</span></p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-indigo-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Automated dispatch & quotes</span>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Logs <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Urgent Jobs */}
        <div 
          onClick={() => {
            setExpandedCard(expandedCard === 'urgent' ? null : 'urgent');
            onNavigateTab('calendar');
          }}
          className={`bg-white p-6 rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md group ${
            expandedCard === 'urgent' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-lg' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Urgent Jobs</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">2 <span className="text-sm font-medium text-slate-500">jobs</span></p>
              <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Requires immediate dispatch</span>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Dispatch <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Needs Attention & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Needs Attention
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">3 Items</span>
          </div>

          <p className="text-xs text-slate-500">Action items requiring your immediate intervention today:</p>

          <div className="space-y-3">
            {/* Overdue Lead */}
            <div 
              onClick={() => onNavigateTab('leads')}
              className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 hover:bg-rose-100/60 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Overdue Lead</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-200 text-rose-800">3 days stale</span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Ing. Jan Svoboda — Pergola installation inquiry in {branding.city}</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-rose-600 font-semibold">
                <span>Action: Call customer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Unanswered Customer */}
            <div 
              onClick={() => onNavigateTab('leads')}
              className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 hover:bg-amber-100/60 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Unanswered Customer</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-800">Waiting 4h</span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Marta Dvořáková sent a WhatsApp question about materials.</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-amber-600 font-semibold">
                <span>Action: Reply via WhatsApp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quote Expiring */}
            <div 
              onClick={() => onNavigateTab('quotes')}
              className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 hover:bg-blue-100/60 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Quote Expiring</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-200 text-blue-800">Expiring in 4h</span>
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Quote Q-2026-0492 (220,000 CZK) pending client sign-off.</p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-blue-600 font-semibold">
                <span>Action: Send reminder SMS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Feed (Right Side) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Live Activity Feed
            </h3>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live syncing
            </span>
          </div>

          <p className="text-xs text-slate-500">Real-time telemetry and team field updates across {branding.name}:</p>

          <div className="space-y-3">
            {[
              { time: '09:42', text: 'Petr Novotný arrived at site (Zahradní 12, Brno)', type: 'arrival', color: 'bg-blue-50 text-blue-700' },
              { time: '10:11', text: 'Customer Ing. Jan Svoboda uploaded 2 site photos (Before category)', type: 'photo', color: 'bg-emerald-50 text-emerald-700' },
              { time: '11:06', text: 'Quote Q-2026-0492 accepted & digital deposit paid (220k CZK)', type: 'quote', color: 'bg-purple-50 text-purple-700' },
              { time: '11:22', text: 'AI Auto-Assignment Engine assigned technician based on GPS proximity', type: 'ai', color: 'bg-indigo-50 text-indigo-700' },
              { time: '11:35', text: 'Payment received: 145,000 CZK wire transfer confirmed by bank', type: 'payment', color: 'bg-emerald-50 text-emerald-700' }
            ].map((act, i) => (
              <div key={i} className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/60 transition-all">
                <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold ${act.color} flex-shrink-0`}>
                  {act.time}
                </span>
                <p className="text-xs font-medium text-slate-800 flex-1">{act.text}</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI Insight Card (Bottom-Right with subtle animation) */}
      <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-slate-900 border border-blue-500/40 p-4 rounded-2xl shadow-2xl text-white animate-bounce-subtle flex items-start gap-3 backdrop-blur-md bg-opacity-95">
        <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 animate-spin-slow" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">AI Executive Insight</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <p className="text-xs text-slate-200 font-medium leading-relaxed">
            {aiInsights[aiInsightIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};
