import React, { useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, MapPin, UserRound } from 'lucide-react';
import type { Lead } from '@/entities/lead';
import { useRouter } from '@/shared/lib/router';

interface OwnerProjectsPageProps { leads: Lead[]; onSelectLead: (lead: Lead) => void; leadDestination?: string; }
const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

export function openOwnerProjectLead(lead: Lead, onSelectLead: (lead: Lead) => void, navigate: (path: string) => void, destination = '/leads'): void {
  onSelectLead(lead);
  navigate(destination);
}

export const OwnerProjectsPage: React.FC<OwnerProjectsPageProps> = ({ leads, onSelectLead, leadDestination = '/leads' }) => {
  const { navigate } = useRouter();
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const active = leads.filter((lead) => lead.status === 'In Progress');
  const completed = leads.filter((lead) => lead.status === 'Completed');
  const projects = filter === 'active' ? active : completed;
  const activeValue = active.reduce((sum, lead) => sum + (lead.price || 0), 0);

  const open = (lead: Lead) => openOwnerProjectLead(lead, onSelectLead, navigate, leadDestination);

  return (
    <div className="workspace-page">
      <header className="workspace-page-header"><div><p className="workspace-kicker">Realizace</p><h1 className="workspace-title">Zakázky firmy</h1><p className="workspace-subtitle">Přehled skutečných zakázek podle uloženého stavu a přiřazení.</p></div></header>
      <section className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => setFilter('active')} className="workspace-metric text-left"><span className="workspace-metric-icon bg-blue-50 text-blue-600"><BriefcaseBusiness className="h-5 w-5" /></span><span className="workspace-metric-label">V realizaci</span><strong>{active.length}</strong><small>aktivních zakázek</small></button>
        <div className="workspace-metric"><span className="workspace-metric-icon bg-violet-50 text-violet-700"><BriefcaseBusiness className="h-5 w-5" /></span><span className="workspace-metric-label">Objem realizace</span><strong className="workspace-metric-money tabular-nums">{currency.format(activeValue)}</strong><small>součet evidovaných cen</small></div>
        <button type="button" onClick={() => setFilter('completed')} className="workspace-metric text-left"><span className="workspace-metric-icon bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span><span className="workspace-metric-label">Dokončeno</span><strong>{completed.length}</strong><small>uložených zakázek</small></button>
      </section>
      <div className="flex gap-2">
        <button type="button" onClick={() => setFilter('active')} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === 'active' ? 'bg-slate-950 text-white' : 'bg-white text-slate-600'}`}>V realizaci</button>
        <button type="button" onClick={() => setFilter('completed')} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === 'completed' ? 'bg-slate-950 text-white' : 'bg-white text-slate-600'}`}>Dokončeno</button>
      </div>
      <section className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => <button key={project.id} type="button" onClick={() => open(project)} className="workspace-panel group p-5 text-left sm:p-6">
          <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${project.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{project.status === 'Completed' ? 'Dokončeno' : 'V realizaci'}</span><strong className="text-right tabular-nums text-sm font-semibold text-slate-800">{project.price ? currency.format(project.price) : 'Cena neuvedena'}</strong></div>
          <h2 className="mt-4 text-base font-semibold tracking-tight text-slate-950">{project.title || 'Zakázka bez názvu'}</h2><p className="mt-1 text-sm text-slate-500">{project.customerName || 'Zákazník neuveden'}</p>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">{(project.address || project.city) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{project.address || project.city}</span>}<span className="inline-flex items-center gap-1.5"><UserRound className="h-4 w-4" />{project.assignedEmployeeName || 'Bez přiřazení'}</span></div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">Otevřít zakázku </span>
        </button>)}
        {!projects.length && <div className="workspace-empty-state col-span-full px-6 py-14 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-400" /><h2 className="mt-3 text-base font-semibold text-slate-950">V této části zatím nejsou zakázky</h2><p className="mt-1 text-sm text-slate-500">Zakázka se objeví po změně jejího stavu v přehledu poptávek.</p></div>}
      </section>
    </div>
  );
};
