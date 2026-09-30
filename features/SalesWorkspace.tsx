import React, { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BriefcaseBusiness, CheckCircle2, ChevronRight, CircleDollarSign, Filter, KanbanSquare, MapPin, Search, Sparkles, UserRound, UsersRound } from 'lucide-react';
import { Lead, LeadStatus, Employee } from '../types';
import { SALES_STAGES, getNextSalesAction, sortSalesLeads, summarizeSalesWorkspace } from '../src/app/salesWorkspace';

interface SalesWorkspaceProps {
  leads: Lead[];
  employees: Employee[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => void;
  onNavigate: (path: string) => void;
}

const formatMoney = (value: number) => `${Math.round(value).toLocaleString('cs-CZ')} Kč`;

export const SalesWorkspace: React.FC<SalesWorkspaceProps> = ({ leads, employees, onSelectLead, onUpdateLeadStatus, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'attention' | 'unassigned'>('all');
  const [selectedStage, setSelectedStage] = useState<LeadStatus | null>(null);
  const summary = useMemo(() => summarizeSalesWorkspace(leads), [leads]);
  const visibleLeads = useMemo(() => sortSalesLeads(leads, query).filter((lead) => {
    if (selectedStage && lead.status !== selectedStage) return false;
    if (filter === 'unassigned') return !lead.assignedEmployeeId;
    if (filter === 'attention') return lead.status === 'New' || lead.status === 'Quote';
    return lead.status !== 'Lost';
  }), [filter, leads, query, selectedStage]);

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-900">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-blue-500"><KanbanSquare className="h-3.5 w-3.5" /> Sales cockpit</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Od poptávky k předané stavbě</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">Jeden pracovní prostor pro obchod, nabídky, přiřazení týmu a realizaci. Každá karta má jasný další krok.</p>
        </div>
        <button type="button" onClick={() => onNavigate('/leads')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-600"><Sparkles className="h-4 w-4" /> Přidat poptávku</button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Aktivní pipeline', value: formatMoney(summary.openValue), icon: CircleDollarSign, color: 'text-blue-600', onClick: () => setFilter('all') },
          { label: 'Celková hodnota', value: formatMoney(summary.pipelineValue), icon: BarChart3, color: 'text-indigo-600', onClick: () => setFilter('all') },
          { label: 'Konverze', value: `${summary.conversionRate} %`, icon: CheckCircle2, color: 'text-emerald-600', onClick: () => setSelectedStage('Completed') },
          { label: 'Bez přiřazení', value: `${summary.unassignedCount}`, icon: UsersRound, color: 'text-amber-600', onClick: () => setFilter('unassigned') },
        ].map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{item.label}</span><item.icon className={`h-4 w-4 ${item.color}`} /></div>
            <strong className="mt-2 block text-xl font-black tracking-tight text-slate-950">{item.value}</strong>
          </button>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hledat zákazníka, zakázku nebo město…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-blue-400 focus:bg-white" /></div>
          <div className="flex flex-wrap items-center gap-2"><Filter className="h-4 w-4 text-slate-400" />
            {[['all', 'Aktivní'], ['attention', 'Vyžaduje pozornost'], ['unassigned', 'Bez přiřazení']].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id as typeof filter)} className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${filter === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{label}</button>)}
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {SALES_STAGES.map((stage) => <button key={stage.id} type="button" onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${selectedStage === stage.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50/70 text-slate-800'}`}><div className="flex items-center justify-between"><span className="h-2 w-2 rounded-full" style={{ background: stage.accent }} /><strong className="text-lg font-black">{summary.stageCounts[stage.id]}</strong></div><span className="mt-2 block text-[11px] font-black">{stage.label}</span><span className={`mt-0.5 block text-[10px] ${selectedStage === stage.id ? 'text-slate-300' : 'text-slate-500'}`}>{stage.description}</span></button>)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {SALES_STAGES.filter((stage) => !selectedStage || selectedStage === stage.id).map((stage) => {
          const stageLeads = visibleLeads.filter((lead) => lead.status === stage.id);
          return <div key={stage.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.accent }} /><h2 className="text-sm font-black text-slate-900">{stage.label}</h2></div><p className="mt-1 text-[11px] font-medium text-slate-500">{stage.description}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{stageLeads.length}</span></div>
            <div className="mt-4 space-y-2">{stageLeads.slice(0, 6).map((lead) => <LeadCard key={lead.id} lead={lead} employees={employees} onSelect={() => onSelectLead(lead)} onAdvance={() => { const next = SALES_STAGES[SALES_STAGES.findIndex((item) => item.id === lead.status) + 1]; if (next) onUpdateLeadStatus(lead.id, next.id); }} />)}{stageLeads.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs font-semibold text-slate-400">Žádné karty v tomto kroku</div>}</div>
            {stageLeads.length > 6 && <button type="button" onClick={() => onNavigate('/leads')} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">Zobrazit všech {stageLeads.length} <ArrowRight className="h-3 w-3" /></button>}
          </div>;
        })}
      </section>
    </div>
  );
};

const LeadCard: React.FC<{ lead: Lead; employees: Employee[]; onSelect: () => void; onAdvance: () => void }> = ({ lead, employees, onSelect, onAdvance }) => {
  const employee = employees.find((item) => item.id === lead.assignedEmployeeId);
  return <article className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-blue-300 hover:bg-white hover:shadow-sm">
    <button type="button" onClick={onSelect} className="block w-full text-left"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-xs font-black text-slate-900">{lead.title}</strong><span className="mt-1 block truncate text-[11px] font-medium text-slate-500">{lead.customerName}</span></div><span className="shrink-0 text-xs font-black text-slate-800">{formatMoney(lead.price || 0)}</span></div><div className="mt-3 flex items-center gap-3 text-[10px] font-semibold text-slate-500"><span className="inline-flex min-w-0 items-center gap-1 truncate"><MapPin className="h-3 w-3" />{lead.city || lead.address || 'Bez lokality'}</span><span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{employee?.name || lead.assignedEmployeeName || 'Nepřiřazeno'}</span></div></button>
    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5"><span className="text-[10px] font-bold text-blue-600">{getNextSalesAction(lead)}</span><div className="flex items-center gap-1"><button type="button" onClick={onSelect} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><ChevronRight className="h-4 w-4" /></button>{lead.status !== 'Completed' && <button type="button" onClick={onAdvance} className="rounded-lg bg-blue-50 px-2 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100">Posunout</button>}</div></div>
  </article>;
};
