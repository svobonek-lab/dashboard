import React, { useState } from 'react';
import { 
  Users, 
  Phone, 
  HardHat, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Star,
  UserPlus,
  Mail
} from 'lucide-react';
import { Lead } from '../../types';

interface TeamTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
}

interface WorkerAssignment {
  id: string;
  name: string;
  role: 'Stavbyvedoucí / Mistr' | 'Tesař / Montér' | 'Zedník / Obkladač' | 'Pomocný dělník';
  phone: string;
  email: string;
  status: 'Na stavbě' | 'Na cestě' | 'Naplánován';
  loggedHours: number;
  hourlyRate: number;
  certifications: string[];
}

export const TeamTab: React.FC<TeamTabProps> = ({ lead, onNotice }) => {
  const [team, setTeam] = useState<WorkerAssignment[]>(() => lead.assignedEmployeeName ? [{
    id: lead.assignedEmployeeId || 'assigned-employee',
    name: lead.assignedEmployeeName,
    role: 'Stavbyvedoucí / Mistr',
    phone: '',
    email: '',
    status: 'Naplánován',
    loggedHours: 0,
    hourlyRate: 0,
    certifications: []
  }] : []);

  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<WorkerAssignment['role']>('Tesař / Montér');

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    const newWorker: WorkerAssignment = {
      id: 'w-' + Date.now(),
      name: newWorkerName,
      role: newWorkerRole,
      phone: '',
      email: '',
      status: 'Naplánován',
      loggedHours: 0,
      hourlyRate: 0,
      certifications: []
    };

    setTeam(prev => [...prev, newWorker]);
    setNewWorkerName('');
    onNotice(`Řemeslník ${newWorkerName} byl přiřazen na tuto stavbu.`);
  };

  const toggleWorkerStatus = (id: string) => {
    setTeam(prev => prev.map(w => {
      if (w.id !== id) return w;
      const next: Record<string, WorkerAssignment['status']> = {
        'Na stavbě': 'Na cestě',
        'Na cestě': 'Naplánován',
        'Naplánován': 'Na stavbě'
      };
      const updated = next[w.status] || 'Na stavbě';
      onNotice(`Stav řemeslníka ${w.name} změněn na: ${updated}`);
      return { ...w, status: updated };
    }));
  };

  const totalLoggedHours = team.reduce((acc, w) => acc + w.loggedHours, 0);
  const totalLaborCost = team.reduce((acc, w) => acc + (w.loggedHours * w.hourlyRate), 0);

  return (
    <div className="space-y-6 font-sans">
      {/* Top summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Přiřazeno řemeslníků</span>
          <p className="text-xl font-black text-slate-900 mt-1">{team.length} pracovníci</p>
          <span className="text-[10px] text-emerald-600 font-bold">2 právě na stavbě</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Odpracované hodiny týmu</span>
          <p className="text-xl font-black text-[#0A84FF] mt-1">{totalLoggedHours.toFixed(1)} h</p>
          <span className="text-[10px] text-slate-500">Z plánovaných 48 h</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Přímé mzdové náklady</span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalLaborCost.toLocaleString('cs-CZ')} Kč</p>
          <span className="text-[10px] text-slate-500">Včetně odvodů a prémií</span>
        </div>
      </div>

      {/* Workers list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Realizační parta zakázky</h2>
            <p className="text-xs text-slate-500 mt-0.5">Řemeslníci a technici odpovědní za kvalitu provedení</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {team.map(worker => (
            <div key={worker.id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-xs shrink-0">
                  {worker.name.split(' ').map(n => n[0]).join('')}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-black text-slate-900">{worker.name}</h3>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-600">{worker.role}</span>
                    <button
                      onClick={() => toggleWorkerStatus(worker.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        worker.status === 'Na stavbě' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        worker.status === 'Na cestě' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                      title="Kliknutím přepnete status docházky"
                    >
                      ● {worker.status}
                    </button>
                  </div>

                  {/* Certifications tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {worker.certifications.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#0A84FF]" />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs pl-13 md:pl-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Vykázáno</span>
                  <span className="font-bold text-slate-900">{worker.loggedHours} h</span>
                  <span className="text-slate-400 text-[10px]"> ({worker.hourlyRate} Kč/h)</span>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${worker.phone}`}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title={`Zavolat: ${worker.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5 text-[#0A84FF]" />
                  </a>
                  <a
                    href={`mailto:${worker.email}`}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title={`Napsat: ${worker.email}`}
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add worker form */}
        <form onSubmit={handleAddWorker} className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap gap-2 items-center text-xs">
          <input
            type="text"
            placeholder="Jméno řemeslníka..."
            value={newWorkerName}
            onChange={e => setNewWorkerName(e.target.value)}
            className="flex-1 min-w-[180px] p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0A84FF]"
          />

          <select
            value={newWorkerRole}
            onChange={e => setNewWorkerRole(e.target.value as any)}
            className="p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          >
            <option value="Stavbyvedoucí / Mistr">Stavbyvedoucí / Mistr</option>
            <option value="Tesař / Montér">Tesař / Montér</option>
            <option value="Zedník / Obkladač">Zedník / Obkladač</option>
            <option value="Pomocný dělník">Pomocný dělník</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Přiřadit na stavbu
          </button>
        </form>
      </div>
    </div>
  );
};
