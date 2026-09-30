import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  ChevronRight, 
  Check, 
  HardHat,
  Sparkles
} from 'lucide-react';
import { Lead } from '../../types';

interface ScheduleTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
}

interface Milestone {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  responsiblePerson: string;
  status: 'Hotovo' | 'Probíhá' | 'Naplánováno' | 'Čeká';
  note: string;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ lead, onNotice }) => {
  const [milestones, setMilestones] = useState<Milestone[]>(() => (lead.timeline || []).map((item, index) => ({
    id: item.id || `timeline-${index}`,
    name: item.title,
    startDate: item.date || item.timestamp || '—',
    endDate: item.date || item.timestamp || '—',
    responsiblePerson: item.responsibleEmployee || lead.assignedEmployeeName || 'Nepřiřazeno',
    status: item.status === 'Completed' ? 'Hotovo' : item.status === 'Current' ? 'Probíhá' : item.status === 'Pending' ? 'Naplánováno' : 'Čeká',
    note: item.description || item.notes || 'Bez doplňující poznámky'
  })));

  const toggleMilestoneStatus = (id: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id !== id) return m;
      const nextStatus: Record<string, Milestone['status']> = {
        'Čeká': 'Naplánováno',
        'Naplánováno': 'Probíhá',
        'Probíhá': 'Hotovo',
        'Hotovo': 'Čeká'
      };
      const updated = nextStatus[m.status] || 'Čeká';
      onNotice(`Milník "${m.name}" změněn na stav: ${updated}`);
      return { ...m, status: updated };
    }));
  };

  const completedCount = milestones.filter(m => m.status === 'Hotovo').length;
  const progressPercent = Math.round((completedCount / milestones.length) * 100);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Progress Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900">Harmonogram etap a milníků stavby</h2>
          <p className="text-xs text-slate-500 mt-0.5">Celkový postup realizace díla v čase</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Dokončeno</span>
            <p className="text-base font-black text-slate-900">{completedCount} z {milestones.length} etap ({progressPercent} %)</p>
          </div>
          <div className="w-32 bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weather Safety Warning */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex items-start gap-3 text-xs">
        <Sparkles className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Předpověď počasí pro lokalitu stavby:</strong>
          <span className="ml-1 text-sky-800">
            Příští 3 dny polojasno, beze srážek, teplota 18 °C. Ideální podmínky pro venkovní montáž a střešní práce bez rizika zpoždění.
          </span>
        </div>
      </div>

      {/* Milestones list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {milestones.map((m, idx) => (
          <div key={m.id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="pt-0.5">
                <button
                  onClick={() => toggleMilestoneStatus(m.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    m.status === 'Hotovo' ? 'bg-emerald-500 text-white shadow-2xs' :
                    m.status === 'Probíhá' ? 'bg-[#0A84FF] text-white animate-pulse' :
                    'border-2 border-slate-300 text-transparent hover:border-slate-400'
                  }`}
                  title="Kliknutím změníte stav milníku"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-black text-slate-900">{m.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    m.status === 'Hotovo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    m.status === 'Probíhá' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                    m.status === 'Naplánováno' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {m.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{m.note}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0 text-xs text-slate-500 pl-9 md:pl-0">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{m.startDate} – {m.endDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{m.responsiblePerson}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
