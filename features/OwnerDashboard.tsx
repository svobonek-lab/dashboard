import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  ArrowRight,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Percent,
  Timer,
  PlayCircle,
  Sparkles,
  Download,
  Building2,
  HardHat
} from 'lucide-react';
import { CompanyBranding, Lead } from '../types';
import { useOrganization } from '@/context/OrganizationContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getOwnerActiveJobs, getOwnerAttentionItems, getOwnerAverageMargin } from './ownerDashboard/dashboardMetrics';

interface OwnerDashboardProps {
  branding: CompanyBranding;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateTab: (tab: string) => void;
  employees?: any[];
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  branding: propBranding,
  leads,
  onSelectLead,
  onNavigateTab,
}) => {
  const { currentOrg, dbUser, user } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');

  const branding = currentOrg?.branding || propBranding;
  const userName = dbUser?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Petře';

  // Compute operational KPIs
  const newLeads = leads.filter(l => l.status === 'New');
  const waitingLeads = leads.filter(l => l.status === 'Quote');
  const pipelineValue = leads
    .filter(l => l.status !== 'Lost')
    .reduce((acc, l) => acc + (l.price || 0), 0);
  
  const attentionItems = getOwnerAttentionItems(leads);
  const activeJobs = getOwnerActiveJobs(leads);
  const averageMargin = getOwnerAverageMargin(leads);
  const attentionNoun = attentionItems.length === 1 ? 'položka' : attentionItems.length >= 2 && attentionItems.length <= 4 ? 'položky' : 'položek';

  // Pipeline count by stage
  const pipelineStages = [
    { id: 'New', name: 'Nová', count: leads.filter(l => l.status === 'New').length, color: 'text-sky-600 bg-sky-50 border-sky-200' },
    { id: 'Contacted', name: 'Zaměření', count: leads.filter(l => l.status === 'Contacted').length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'Quote', name: 'Nabídka', count: leads.filter(l => l.status === 'Quote').length, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { id: 'In Progress', name: 'Realizace', count: leads.filter(l => l.status === 'In Progress').length, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'Completed', name: 'Dokončeno', count: leads.filter(l => l.status === 'Completed').length, color: 'text-purple-600 bg-purple-50 border-purple-200' }
  ];

  const filteredLeads = searchQuery.trim()
    ? leads.filter(l => 
        l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.location || l.city || l.address || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leads;

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-900">
      
      {/* 1. Header Toolbar with Search & New Inquiry Action */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat zakázku, zákazníka, lokalitu..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#0A84FF] focus:bg-white rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => onNavigateTab('leads')}
            className="px-4 py-2 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nová poptávka</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Greeting Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
              Dobré ráno, {userName}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0A84FF] border border-blue-200">
              {currentOrg?.name || 'StavbaFlow'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            {attentionItems.length ? <>K vyřízení máte <span className="font-bold text-[#FF453A]">{attentionItems.length} {attentionNoun}</span>.</> : 'Všechny nové poptávky a nabídky máte pod kontrolou.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Připojení dat</span>
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-end">
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
              {isSupabaseConfigured ? 'Supabase Postgres (Aktivní)' : 'Ukázková firma · demo data'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 4 Standardized High-Density KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Nové */}
        <div 
          onClick={() => onNavigateTab('leads')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Nové poptávky</span>
            <span className="w-2 h-2 rounded-full bg-[#0A84FF]"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {newLeads.length}
            </div>
            <span className="text-[11px] font-bold text-[#0A84FF] flex items-center gap-0.5">K vyřízení</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Poptávky bez zaznamenaného kontaktu</p>
        </div>

        {/* KPI 2: Čeká na reakci */}
        <div 
          onClick={() => onNavigateTab('quotes')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-amber-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Čeká na reakci</span>
            <span className="w-2 h-2 rounded-full bg-[#FF9F0A]"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {waitingLeads.length}
            </div>
            <span className="text-[11px] font-bold text-[#FF9F0A]">
              Follow-up
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Nabídky čekající na rozhodnutí zákazníka</p>
        </div>

        {/* KPI 3: Pipeline */}
        <div 
          onClick={() => onNavigateTab('leads')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-purple-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Obchodní Pipeline</span>
            <span className="w-2 h-2 rounded-full bg-[#7C3AED]"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {pipelineValue >= 1_000_000
                ? `${(pipelineValue / 1_000_000).toFixed(2)} M` 
                : pipelineValue > 0
                ? `${Math.round(pipelineValue / 1000)} tis.`
                : '0'}
            </div>
            <span className="text-[11px] font-bold text-slate-500">Kč</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">Objem aktivních zakázek</p>
        </div>

        {/* KPI 4: Marže */}
        <div 
          onClick={() => onNavigateTab('analytics')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Průměrná Marže</span>
            <span className="w-2 h-2 rounded-full bg-[#34C759]"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {averageMargin === null ? '—' : `${averageMargin.toFixed(1)} %`}
            </div>
            {averageMargin !== null && <span className="text-[11px] font-bold text-[#34C759]">Z evidovaných zakázek</span>}
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">{averageMargin === null ? 'Zatím bez vyčíslených marží' : 'Průměr evidovaných marží'}</p>
        </div>
      </div>

      {/* 4. Dual Operational Focus: POTŘEBUJE POZORNOST & DNEŠNÍ REALIZACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BLOCK A: POTŘEBUJE POZORNOST */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF453A] animate-pulse"></span>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Potřebuje pozornost ({attentionItems.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Nové poptávky a nabídky bez odpovědi</span>
            </div>

            <div className="space-y-3">
              {attentionItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border transition-all bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type === 'critical' ? 'bg-red-100 text-[#FF453A]' :
                          item.type === 'warning' ? 'bg-amber-100 text-[#FF9F0A]' : 'bg-blue-100 text-[#0A84FF]'
                        }`}>
                          {item.tag}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{item.client}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Částka: <strong className="text-slate-800">{item.amount}</strong> · {item.deadline}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const target = leads.find((lead) => lead.id === item.leadId);
                        if (target) onSelectLead(target);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 bg-[#0A84FF] text-white hover:bg-blue-600 shadow-2xs"
                    >
                      {item.actionText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{attentionItems.length ? 'Položky vycházejí z aktuálních poptávek firmy.' : 'Žádné nové poptávky ani nabídky teď nečekají na další krok.'}</span>
            <button 
              onClick={() => onNavigateTab('leads')}
              className="text-[#0A84FF] font-bold hover:underline flex items-center gap-1"
            >
              Otevřít Kanban <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* BLOCK B: DNEŠNÍ REALIZACE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]"></span>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Zakázky v realizaci ({activeJobs.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Předané realizačnímu týmu</span>
            </div>

            <div className="space-y-3">
              {activeJobs.map((lead) => (
                <button key={lead.id} onClick={() => onSelectLead(leads.find((item) => item.id === lead.id)!)} className="w-full text-left p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 transition-all flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="text-xs font-black text-slate-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono shrink-0">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{lead.customerName} · {lead.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{lead.assignedEmployeeName || 'Tým zatím není přiřazen'} · {lead.price > 0 ? `${lead.price.toLocaleString('cs-CZ')} Kč` : 'Cena není uvedena'}</p>
                    </div>
                  </div>

                  <span className="px-2 py-1 rounded-md text-[10px] font-bold border shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                    V realizaci
                  </span>
                </button>
              ))}
              {!activeJobs.length && <div className="p-7 text-center text-xs text-slate-500">Zatím nemáte žádnou zakázku předanou do realizace.</div>}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Zakázky vycházejí ze záznamů ve vaší firmě.</span>
            <button 
              onClick={() => onNavigateTab('calendar')}
              className="text-[#0A84FF] font-bold hover:underline flex items-center gap-1"
            >
              Celý kalendář <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Horizontal Business Pipeline Lifecycle Overview */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Obchodní Pipeline Zakázek
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">
            Tok: Poptávka → Zaměření → Nabídka → Rozhodnutí → Realizace
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {pipelineStages.map((stage, idx) => (
            <div 
              key={stage.id}
              onClick={() => onNavigateTab('leads')}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mb-1">
                <span>{stage.name}</span>
                <span className="text-[10px] text-slate-400">Krok {idx + 1}</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {stage.count} <span className="text-xs font-normal text-slate-500">zakázek</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Quick Realization List (Active Leads) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Aktivní zakázky a projekty
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klikněte na jakoukoliv zakázku pro otevření kompletní operační karty firmy
            </p>
          </div>
          <button 
            onClick={() => onNavigateTab('leads')}
            className="text-xs font-bold text-[#0A84FF] hover:underline"
          >
            Zobrazit všech ({leads.length})
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredLeads.slice(0, 5).map((lead) => (
            <div
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0A84FF] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                  {lead.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {lead.customerName}
                    <span className="text-xs font-normal text-slate-500">· {lead.title}</span>
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{lead.location || lead.city || lead.address || 'Lokalita neuvedena'}</span>
                    <span>•</span>
                    <span>Termín: {lead.preferredDate || 'neuveden'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900">
                    {lead.price > 0 ? `${lead.price.toLocaleString('cs-CZ')} Kč` : 'Cena neuvedena'}
                  </div>
                  {typeof lead.calculatedMargin === 'number' && Number.isFinite(lead.calculatedMargin)
                    ? <span className="text-[10px] font-bold text-emerald-600">Marže {lead.calculatedMargin.toFixed(1)} %</span>
                    : <span className="text-[10px] text-slate-500">Marže nevyčíslena</span>}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  lead.status === 'New' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                  lead.status === 'Contacted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  lead.status === 'Quote' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  lead.status === 'In Progress' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {lead.status === 'New' ? 'Nová' :
                   lead.status === 'Contacted' ? 'Zaměření' :
                   lead.status === 'Quote' ? 'Nabídka' :
                   lead.status === 'In Progress' ? 'Realizace' :
                   lead.status === 'Completed' ? 'Dokončeno' : lead.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
