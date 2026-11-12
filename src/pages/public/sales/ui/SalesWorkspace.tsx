import React, { useMemo, useState } from 'react';
import { BarChart3, BriefcaseBusiness, CheckCircle2, CircleDollarSign, ClipboardCheck, Download, Filter, KanbanSquare, MapPin, Phone, Search, Sparkles, UserRound, UsersRound, X } from 'lucide-react';
import type { Lead, LeadStatus } from '@/entities/lead';
import type { Employee } from '@/entities/employee';
import { SALES_STAGES, getNextSalesAction, sortSalesLeads, summarizeSalesWorkspace } from '@/pages/public/sales';

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
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const summary = useMemo(() => summarizeSalesWorkspace(leads), [leads]);
  const visibleLeads = useMemo(() => sortSalesLeads(leads, query).filter((lead) => {
    if (selectedStage && lead.status !== selectedStage) return false;
    if (filter === 'unassigned') return !lead.assignedEmployeeId;
    if (filter === 'attention') return lead.status === 'New' || lead.status === 'Quote';
    return lead.status !== 'Lost';
  }), [filter, leads, query, selectedStage]);

  const exportPipeline = () => {
    const header = 'Zakázka;Zákazník;Stav;Cena;Přiřazeno\n';
    const rows = visibleLeads.map((lead) => `${lead.title};${lead.customerName};${lead.status};${lead.price || 0};${lead.assignedEmployeeName || ''}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `stavbaflow-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="space-y-6 pb-20 font-sans text-slate-900">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-500"><KanbanSquare className="h-3.5 w-3.5" /> Sales cockpit</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Od poptávky k předané stavbě</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">Jeden pracovní prostor pro obchod, nabídky, přiřazení týmu a realizaci. Každá karta má jasný další krok.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPlaybookOpen((open) => !open)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300"><ClipboardCheck className="h-4 w-4 text-blue-500" /> {playbookOpen ? 'Skrýt postup' : 'Otevřít postup'}</button>
          <button type="button" onClick={exportPipeline} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300"><Download className="h-4 w-4 text-slate-500" /> {exported ? 'CSV staženo' : 'Stáhnout CSV'}</button>
          <button type="button" onClick={() => onNavigate('/leads')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-600"><Sparkles className="h-4 w-4" /> Přidat poptávku</button>
        </div>
      </header>

      {playbookOpen && <SalesPlaybook onNavigate={onNavigate} />}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Zobrazit aktivní poptávky', value: formatMoney(summary.openValue), icon: CircleDollarSign, color: 'text-blue-600', onClick: () => setFilter('all') },
          { label: 'Zobrazit celkovou hodnotu', value: formatMoney(summary.pipelineValue), icon: BarChart3, color: 'text-indigo-600', onClick: () => setFilter('all') },
          { label: 'Zobrazit dokončené', value: `${summary.conversionRate} %`, icon: CheckCircle2, color: 'text-emerald-600', onClick: () => setSelectedStage('Completed') },
          { label: 'Zobrazit nepřiřazené', value: `${summary.unassignedCount}`, icon: UsersRound, color: 'text-amber-600', onClick: () => setFilter('unassigned') },
        ].map((item) => (
          <button key={item.label} type="button" onClick={item.onClick} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between"><span className="text-[10px] font-black text-slate-400">{item.label}</span><item.icon className={`h-4 w-4 ${item.color}`} /></div>
            <strong className="mt-2 block text-xl font-black tracking-tight text-slate-950">{item.value}</strong>
          </button>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hledat zákazníka, zakázku nebo město…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none transition focus:border-blue-400 focus:bg-white" /></div>
          <div className="flex flex-wrap items-center gap-2"><Filter className="h-4 w-4 text-slate-400" />
            {[['all', 'Zobrazit aktivní'], ['attention', 'Zobrazit k vyřízení'], ['unassigned', 'Zobrazit nepřiřazené']].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id as typeof filter)} className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${filter === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{label}</button>)}
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {SALES_STAGES.map((stage) => <button key={stage.id} type="button" onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${selectedStage === stage.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50/70 text-slate-800'}`}><div className="flex items-center justify-between"><span className="h-2 w-2 rounded-full" style={{ background: stage.accent }} /><strong className="text-lg font-black">{summary.stageCounts[stage.id]}</strong></div><span className="mt-2 block text-[11px] font-black">Zobrazit {stage.label.toLocaleLowerCase('cs-CZ')}</span><span className={`mt-0.5 block text-[10px] ${selectedStage === stage.id ? 'text-slate-300' : 'text-slate-500'}`}>{stage.description}</span></button>)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {SALES_STAGES.filter((stage) => !selectedStage || selectedStage === stage.id).map((stage) => {
          const stageLeads = visibleLeads.filter((lead) => lead.status === stage.id);
          return <div key={stage.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.accent }} /><h2 className="text-sm font-black text-slate-900">{stage.label}</h2></div><p className="mt-1 text-[11px] font-medium text-slate-500">{stage.description}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{stageLeads.length}</span></div>
            <div className="mt-4 space-y-2">{stageLeads.slice(0, 6).map((lead) => <LeadCard key={lead.id} lead={lead} employees={employees} onSelect={() => { setDetailLead(lead); onSelectLead(lead); }} onAdvance={() => { const next = SALES_STAGES[SALES_STAGES.findIndex((item) => item.id === lead.status) + 1]; if (next) onUpdateLeadStatus(lead.id, next.id); }} />)}{stageLeads.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs font-semibold text-slate-400"><p>V tomto kroku zatím není žádná poptávka.</p><button type="button" onClick={() => onNavigate('/leads')} className="mt-2 text-blue-700">Otevřít poptávky</button></div>}</div>
            {stageLeads.length > 6 && <button type="button" onClick={() => onNavigate('/leads')} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">Zobrazit všech {stageLeads.length} poptávek</button>}
          </div>;
        })}
      </section>
      <TeamWorkload employees={employees} leads={leads} onNavigate={onNavigate} />
      {detailLead && <LeadActionDrawer lead={detailLead} onClose={() => setDetailLead(null)} onAdvance={() => { const index = SALES_STAGES.findIndex((stage) => stage.id === detailLead.status); const next = SALES_STAGES[index + 1]; if (next) { onUpdateLeadStatus(detailLead.id, next.id); setDetailLead({ ...detailLead, status: next.id }); } }} onNavigate={onNavigate} />}
    </div>
  );
};

const SalesPlaybook: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => (
  <section className="grid gap-3 rounded-3xl border border-blue-100 bg-surface p-4 shadow-sm sm:grid-cols-3 sm:p-5">
    <div className="sm:col-span-3"><p className="text-[10px] font-black text-blue-500">Obchodní playbook</p><h2 className="mt-1 text-sm font-black text-slate-900">Tři kroky, které zrychlí první reakci zákazníkovi</h2></div>
    {[['01', 'Zavolejte do 15 minut', 'Nové poptávky mají nejvyšší šanci, když zákazník dostane první kontakt ještě dnes.', '/leads'], ['02', 'Doplňte cenu a další krok', 'Obchodní stav, cena a historie zůstávají přímo u poptávky.', '/leads'], ['03', 'Přiřaďte zodpovědnost', 'Každá realizace má vlastníka. Tým vidí jen práci, kterou má skutečně dodat.', '/employees']].map(([number, title, description, href]) => <button key={number} type="button" onClick={() => onNavigate(href)} className="rounded-2xl border border-blue-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm"><span className="text-xs font-black text-blue-500">{number}</span><strong className="mt-2 block text-xs font-black text-slate-900">{title}</strong><span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{description}</span><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">Otevřít </span></button>)}
  </section>
);

const TeamWorkload: React.FC<{ employees: Employee[]; leads: Lead[]; onNavigate: (path: string) => void }> = ({ employees, leads, onNavigate }) => {
  const assigned = employees.map((employee) => ({ employee, count: leads.filter((lead) => lead.assignedEmployeeId === employee.id && lead.status !== 'Completed' && lead.status !== 'Lost').length }));
  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black text-slate-400">Kapacita týmu</p><h2 className="mt-1 text-sm font-black text-slate-900">Kdo má na starosti další krok</h2></div><button type="button" onClick={() => onNavigate('/employees')} className="text-[11px] font-bold text-blue-600">Spravovat tým </button></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{assigned.length ? assigned.slice(0, 6).map(({ employee, count }) => <div key={employee.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-3"><div className="min-w-0"><strong className="block truncate text-xs font-black text-slate-800">{employee.name}</strong><span className="text-[10px] font-medium text-slate-500">{employee.specialization || 'Člen týmu'}</span></div><span className={`rounded-lg px-2 py-1 text-[10px] font-black ${count > 3 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{count} aktivní</span></div>) : <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-400 sm:col-span-3"><p>Zatím nemáte přiřazeného žádného člena týmu.</p><button type="button" onClick={() => onNavigate('/employees')} className="mt-2 text-blue-700">Otevřít tým</button></div>}</div></section>;
};

const LeadActionDrawer: React.FC<{ lead: Lead; onClose: () => void; onAdvance: () => void; onNavigate: (path: string) => void }> = ({ lead, onClose, onAdvance, onNavigate }) => {
  const stageIndex = SALES_STAGES.findIndex((stage) => stage.id === lead.status);
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 backdrop-blur-sm" onClick={onClose}><aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black text-blue-500">Akční detail</p><h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{lead.title}</h2><p className="mt-1 text-xs font-medium text-slate-500">{lead.customerName}, {lead.city || lead.address}</p></div><button type="button" aria-label="Zavřít detail zakázky" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button></div><div className="mt-6 rounded-2xl bg-slate-950 p-4 text-white"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">Hodnota zakázky</span><CircleDollarSign className="h-4 w-4 text-emerald-400" /></div><strong className="mt-2 block text-2xl font-black">{formatMoney(lead.price || 0)}</strong><span className="mt-1 block text-xs text-slate-400">Další krok: {getNextSalesAction(lead)}</span></div><div className="mt-6 space-y-2">{SALES_STAGES.map((stage, index) => <div key={stage.id} className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${index <= stageIndex ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{index < stageIndex ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</span><div className="flex-1"><strong className={`text-xs ${index <= stageIndex ? 'text-slate-900' : 'text-slate-400'}`}>{stage.label}</strong><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: index <= stageIndex ? '100%' : '0%' }} /></div></div></div>)}</div><div className="mt-7 grid gap-2"><button type="button" onClick={onAdvance} disabled={lead.status === 'Completed'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0A84FF] px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200">{lead.status === 'Completed' ? 'Zakázka dokončena' : 'Posunout na další krok'} </button><button type="button" onClick={() => onNavigate('/leads')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Otevřít plný detail </button><a href={`tel:${lead.customerPhone || lead.phone || ''}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><Phone className="h-3.5 w-3.5" /> Zavolat zákazníkovi</a></div></aside></div>;
};

const LeadCard: React.FC<{ lead: Lead; employees: Employee[]; onSelect: () => void; onAdvance: () => void }> = ({ lead, employees, onSelect, onAdvance }) => {
  const employee = employees.find((item) => item.id === lead.assignedEmployeeId);
  return <article className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-blue-300 hover:bg-white hover:shadow-sm">
    <button type="button" aria-label={`Otevřít detail zakázky ${lead.title}`} onClick={onSelect} className="block w-full text-left"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-xs font-black text-slate-900">{lead.title}</strong><span className="mt-1 block truncate text-[11px] font-medium text-slate-500">{lead.customerName}</span></div><span className="shrink-0 text-xs font-black text-slate-800">{formatMoney(lead.price || 0)}</span></div><div className="mt-3 flex items-center gap-3 text-[10px] font-semibold text-slate-500"><span className="inline-flex min-w-0 items-center gap-1 truncate"><MapPin className="h-3 w-3" />{lead.city || lead.address || 'Bez lokality'}</span><span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{employee?.name || lead.assignedEmployeeName || 'Nepřiřazeno'}</span></div></button>
    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5"><span className="text-[10px] font-bold text-blue-600">{getNextSalesAction(lead)}</span><div className="flex items-center gap-1">{lead.status !== 'Completed' && <button type="button" onClick={onAdvance} className="rounded-lg bg-blue-50 px-2 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100">Posunout</button>}</div></div>
  </article>;
};
