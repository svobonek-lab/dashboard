import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Mail, MapPin, Phone, Save, UserRound } from 'lucide-react';
import type { Lead } from '../../../entities/lead';
import type { Employee } from '../../../entities/employee';
import { buildLeadAssignmentPatch } from '../../../entities/lead';
import { DocumentsTab } from './lead-tabs/DocumentsTab';

type LeadUpdate = Partial<Lead> & Pick<Lead, 'id'>;

interface LeadDetailProps {
  lead: Lead;
  employees: Employee[];
  onBack: () => void;
  onOpenPhoto: (url: string, title: string, category: string) => void;
  onOpenVoiceNotes: () => void;
  onUpdateLead: (updated: LeadUpdate) => Promise<unknown> | void;
  canManageAssignment?: boolean;
  canEditOperationalFields?: boolean;
}

const statusLabel: Record<Lead['status'], string> = {
  New: 'Nová poptávka', Contacted: 'Kontaktováno', Quote: 'Nabídka',
  'In Progress': 'V realizaci', Completed: 'Dokončeno', Lost: 'Nezískáno',
};

export const LeadDetail: React.FC<LeadDetailProps> = ({ lead, employees, onBack, onUpdateLead, canManageAssignment = true, canEditOperationalFields = false }) => {
  const [employeeId, setEmployeeId] = useState(lead.assignedEmployeeId || '');
  const [saveState, setSaveState] = useState<{ kind: 'idle' | 'saving' | 'success' | 'error'; text?: string }>({ kind: 'idle' });
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.active !== false && employee.invitationStatus !== 'Disabled'), [employees]);
  const price = lead.price > 0 ? new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(lead.price) : 'Cena neuvedena';
  const [operational, setOperational] = useState({ description: lead.description || '', address: lead.address || '', customerPhone: lead.customerPhone || '', customerEmail: lead.customerEmail || '' });

  const saveAssignment = async () => {
    const employee = activeEmployees.find((item) => item.id === employeeId);
    setSaveState({ kind: 'saving' });
    try {
      await onUpdateLead(buildLeadAssignmentPatch(lead.id, employee));
      setSaveState({ kind: 'success', text: employee ? `Zakázka je přiřazena: ${employee.name}.` : 'Přiřazení bylo odebráno.' });
    } catch (error) {
      setSaveState({ kind: 'error', text: error instanceof Error ? error.message : 'Přiřazení se nepodařilo uložit.' });
    }
  };

  const saveOperationalFields = async () => {
    setSaveState({ kind: 'saving' });
    try {
      await onUpdateLead({ id: lead.id, ...operational });
      setSaveState({ kind: 'success', text: 'Údaje ze stavby byly uloženy.' });
    } catch (error) {
      setSaveState({ kind: 'error', text: error instanceof Error ? error.message : 'Údaje se nepodařilo uložit.' });
    }
  };

  return (
    <div className="workspace-page mx-auto max-w-5xl">
      <header>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Zpět na poptávky</button>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="workspace-kicker">{statusLabel[lead.status]}</p><h1 className="workspace-title">{lead.title || 'Zakázka bez názvu'}</h1><p className="workspace-subtitle">{lead.customerName || 'Zákazník neuveden'}{lead.city ? ` · ${lead.city}` : ''}</p></div>
          <strong className="text-lg font-semibold text-slate-950">{price}</strong>
        </div>
      </header>

      {saveState.kind === 'success' && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />{saveState.text}</div>}
      {saveState.kind === 'error' && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{saveState.text}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <section className="workspace-panel p-5 sm:p-7">
          <h2 className="text-base font-semibold text-slate-950">Zakázka a zákazník</h2>
          {lead.description && <p className="mt-3 text-sm leading-6 text-slate-600">{lead.description}</p>}
          <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><UserRound className="mt-0.5 h-4 w-4 text-slate-400" /><span><small className="block text-xs text-slate-400">Zákazník</small><strong className="mt-0.5 block font-medium">{lead.customerName || 'Neuveden'}</strong></span></div>
            {(lead.address || lead.location || lead.city) && <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><MapPin className="mt-0.5 h-4 w-4 text-slate-400" /><span><small className="block text-xs text-slate-400">Místo</small><strong className="mt-0.5 block font-medium">{lead.address || lead.location || lead.city}</strong></span></div>}
            {(lead.customerPhone || lead.phone) && <a href={`tel:${lead.customerPhone || lead.phone}`} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 hover:bg-blue-50"><Phone className="mt-0.5 h-4 w-4 text-blue-600" /><span><small className="block text-xs text-slate-400">Telefon</small><strong className="mt-0.5 block font-medium text-blue-700">{lead.customerPhone || lead.phone}</strong></span></a>}
            {(lead.customerEmail || lead.email) && <a href={`mailto:${lead.customerEmail || lead.email}`} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 hover:bg-blue-50"><Mail className="mt-0.5 h-4 w-4 text-blue-600" /><span className="min-w-0"><small className="block text-xs text-slate-400">E-mail</small><strong className="mt-0.5 block truncate font-medium text-blue-700">{lead.customerEmail || lead.email}</strong></span></a>}
            {lead.preferredDate && <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><Clock3 className="mt-0.5 h-4 w-4 text-slate-400" /><span><small className="block text-xs text-slate-400">Preferovaný termín</small><strong className="mt-0.5 block font-medium">{lead.preferredDate}</strong></span></div>}
          </div>
        </section>

        {canManageAssignment && <aside className="workspace-panel p-5 sm:p-7">
          <h2 className="text-base font-semibold text-slate-950">Odpovědný zaměstnanec</h2><p className="mt-2 text-sm leading-5 text-slate-500">Po uložení se zakázka objeví v pracovním dashboardu vybraného zaměstnance.</p>
          <label className="mt-5 block text-xs font-semibold text-slate-700">Přiřazení<select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900"><option value="">Bez přiřazení</option>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
          <button type="button" disabled={saveState.kind === 'saving' || employeeId === (lead.assignedEmployeeId || '')} onClick={saveAssignment} className="workspace-primary-action mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saveState.kind === 'saving' ? 'Ukládám…' : 'Uložit přiřazení'}</button>
        </aside>}
      </div>

      {canEditOperationalFields && <section className="workspace-panel p-5 sm:p-7">
        <h2 className="text-base font-semibold text-slate-950">Záznam přímo ze stavby</h2>
        <p className="mt-1 text-sm text-slate-500">Můžete upravit jen provozní údaje povolené databázovou politikou.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">Adresa<input value={operational.address} onChange={(event) => setOperational((value) => ({ ...value, address: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-700">Telefon<input type="tel" value={operational.customerPhone} onChange={(event) => setOperational((value) => ({ ...value, customerPhone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Kontaktní e-mail<input type="email" value={operational.customerEmail} onChange={(event) => setOperational((value) => ({ ...value, customerEmail: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Popis a poznámka z místa<textarea value={operational.description} onChange={(event) => setOperational((value) => ({ ...value, description: event.target.value }))} rows={4} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
        </div>
        <button type="button" disabled={saveState.kind === 'saving'} onClick={saveOperationalFields} className="workspace-primary-action mt-4 inline-flex min-h-10 items-center gap-2 px-4 text-sm font-semibold disabled:opacity-50"><Save className="h-4 w-4" />{saveState.kind === 'saving' ? 'Ukládám…' : 'Uložit údaje ze stavby'}</button>
      </section>}

      <section className="workspace-panel p-5 sm:p-7">
        <h2 className="text-base font-semibold text-slate-950">Uložená historie</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {(lead.history || []).map((event) => <div key={event.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[150px_1fr_auto]"><time className="text-xs text-slate-400">{event.timestamp}</time><span className="font-medium text-slate-800">{event.action}</span><span className="text-xs text-slate-500">{event.author}</span></div>)}
          {!lead.history?.length && <p className="py-7 text-center text-sm text-slate-500">Zatím nejsou uložené žádné události.</p>}
        </div>
      </section>
      <DocumentsTab lead={lead} />
    </div>
  );
};
