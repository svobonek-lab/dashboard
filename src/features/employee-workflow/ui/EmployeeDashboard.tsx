import React, { useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, Clock3, MapPin, Phone } from 'lucide-react';
import type { CompanyBranding } from '../../../entities/company';
import type { Lead, LeadStatus } from '../../../entities/lead';
import { LeadStatusBadge } from '../../../entities/lead';
import { getEmployeeNextStatus } from '../../../entities/lead';

interface EmployeeDashboardProps {
  leads: Lead[];
  branding: CompanyBranding;
  onOpenVoiceNotes: () => void;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
  onUpdateLeadStatus?: (leadId: string, status: LeadStatus) => Promise<void> | void;
}

const nextStatusLabel: Partial<Record<LeadStatus, string>> = {
  Contacted: 'Potvrdit kontakt', Quote: 'Předat do nabídky',
  'In Progress': 'Zahájit realizaci', Completed: 'Dokončit zakázku',
};

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ leads, onSelectLead, onUpdateLeadStatus }) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');
  const active = leads.filter((lead) => lead.status !== 'Completed' && lead.status !== 'Lost');
  const completed = leads.filter((lead) => lead.status === 'Completed').length;

  const advance = async (lead: Lead) => {
    const next = getEmployeeNextStatus(lead.status);
    if (!next || !onUpdateLeadStatus) return;
    setStatusError('');
    setUpdatingId(lead.id);
    try { await onUpdateLeadStatus(lead.id, next); }
    catch { setStatusError('Stav zakázky se neuložil. Zkontrolujte připojení a zkuste to znovu.'); }
    finally { setUpdatingId(null); }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <div><p className="workspace-kicker">Pracovní přehled</p><h1 className="workspace-title">Moje zakázky</h1><p className="workspace-subtitle">Vidíte pouze práci, kterou vám přiřadila vaše firma.</p></div>
        <div className="workspace-panel min-w-32 px-4 py-3 text-right"><strong className="block text-xl font-semibold text-slate-950">{active.length}</strong><span className="text-xs text-slate-500">aktivní zakázky</span></div>
      </header>
      {statusError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{statusError}</div>}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="workspace-metric"><span className="workspace-metric-icon bg-blue-50 text-blue-600"><BriefcaseBusiness className="h-5 w-5" /></span><span className="workspace-metric-label">Přiřazeno</span><strong>{leads.length}</strong><small>zakázek celkem</small></div>
        <div className="workspace-metric"><span className="workspace-metric-icon bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span><span className="workspace-metric-label">Dokončeno</span><strong>{completed}</strong><small>uložených realizací</small></div>
      </section>
      <section className="space-y-3" aria-label="Přiřazené zakázky">
        {active.map((lead) => {
          const next = getEmployeeNextStatus(lead.status);
          const location = lead.address || lead.location || lead.city;
          return (
            <article key={lead.id} className="workspace-panel p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><LeadStatusBadge status={lead.status} />{lead.priority === 'Urgent' || lead.priority === 'High' ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Prioritní</span> : null}</div>
                  <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">{lead.title || 'Zakázka bez názvu'}</h2><p className="mt-1 text-sm text-slate-500">{lead.customerName || 'Zákazník neuveden'}</p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">{location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{location}</span>}{lead.preferredDate && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-slate-400" />{lead.preferredDate}</span>}{(lead.customerPhone || lead.phone) && <a href={`tel:${lead.customerPhone || lead.phone}`} className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-700"><Phone className="h-4 w-4" />Zavolat</a>}</div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:w-48">
                  <button type="button" onClick={() => onSelectLead(lead)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Otevřít detail </button>
                  {next && onUpdateLeadStatus && <button type="button" disabled={updatingId === lead.id} onClick={() => advance(lead)} className="workspace-primary-action inline-flex min-h-11 items-center justify-center px-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">{updatingId === lead.id ? 'Ukládám stav zakázky…' : nextStatusLabel[next] || 'Posunout stav'}</button>}
                </div>
              </div>
            </article>
          );
        })}
        {!active.length && <div className="workspace-empty-state px-6 py-14 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 text-sm text-slate-500">Aktuálně nemáte žádnou aktivní přiřazenou zakázku.</p><button type="button" onClick={() => window.location.reload()} className="mt-3 font-semibold text-blue-700">Obnovit zakázky</button></div>}
      </section>
    </div>
  );
};
