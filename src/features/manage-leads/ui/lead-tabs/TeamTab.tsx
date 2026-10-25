import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Mail, UserRoundCheck } from 'lucide-react';
import type { Lead } from '../../../../entities/lead';
import type { Employee } from '../../../../entities/employee';
import { buildLeadAssignment, getAssignableEmployees } from '../../../../entities/lead';

interface TeamTabProps {
  lead: Lead;
  employees: Employee[];
  onNotice: (msg: string) => void;
  onUpdateLead: (updated: Lead) => Promise<unknown> | void;
}

export const TeamTab: React.FC<TeamTabProps> = ({ lead, employees, onNotice, onUpdateLead }) => {
  const assignableEmployees = useMemo(
    () => getAssignableEmployees(employees, lead.organization_id),
    [employees, lead.organization_id],
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(lead.assignedEmployeeId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedEmployeeId(lead.assignedEmployeeId || '');
  }, [lead.assignedEmployeeId]);

  const assignedEmployee = assignableEmployees.find((employee) => employee.id === lead.assignedEmployeeId);

  const saveAssignment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updatedLead = buildLeadAssignment(lead, selectedEmployeeId, assignableEmployees, lead.organization_id);
      await onUpdateLead(updatedLead);
      onNotice(selectedEmployeeId
        ? `Zakázka byla přiřazena pracovníkovi ${updatedLead.assignedEmployeeName}.`
        : 'Přiřazení pracovníka bylo zrušeno.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Přiřazení se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Odpovědný pracovník</span>
          <p className="text-lg font-black text-slate-900 mt-1">{assignedEmployee?.name || 'Nepřiřazeno'}</p>
          <span className="text-[10px] text-slate-500">
            {assignedEmployee ? 'Aktivní člen této firmy' : 'Vyberte pracovníka z ověřeného seznamu'}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dostupní zaměstnanci</span>
          <p className="text-lg font-black text-[#0A84FF] mt-1">{assignableEmployees.length}</p>
          <span className="text-[10px] text-slate-500">Pouze aktivní zaměstnanci stejné firmy</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900">Přiřazení zakázky</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Změna se projeví až po potvrzení databází a zaměstnanec uvidí pouze své přiřazené zakázky.
          </p>
        </div>

        {assignedEmployee && (
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <UserRoundCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-900 truncate">{assignedEmployee.name}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> Aktivní
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" /> {assignedEmployee.email}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={saveAssignment} className="p-5 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block" htmlFor="lead-assignment">
            Přiřazený zaměstnanec
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              id="lead-assignment"
              aria-label="Přiřazený zaměstnanec"
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              className="flex-1 p-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#0A84FF]"
            >
              <option value="">Nepřiřazeno</option>
              {assignableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name} · {employee.email}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving || selectedEmployeeId === (lead.assignedEmployeeId || '')}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs transition-colors"
            >
              {saving ? 'Ukládám…' : 'Uložit přiřazení'}
            </button>
          </div>
          {assignableEmployees.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Firma zatím nemá aktivního zaměstnance. Nejprve dokončete jeho pozvánku a aktivaci.
            </p>
          )}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
        </form>
      </div>
    </div>
  );
};
