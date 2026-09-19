import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  User, 
  Plus, 
  FileText, 
  Download,
  AlertCircle
} from 'lucide-react';
import { Lead } from '../../types';

interface TimeLogsTabProps {
  lead: Lead;
  onNotice: (msg: string) => void;
}

interface TimeEntry {
  id: string;
  date: string;
  workerName: string;
  hours: number;
  activity: string;
  approved: boolean;
}

export const TimeLogsTab: React.FC<TimeLogsTabProps> = ({ lead, onNotice }) => {
  const [entries, setEntries] = useState<TimeEntry[]>([
    {
      id: 't-1',
      date: '11. 10. 2026',
      workerName: lead.assignedEmployeeName || 'Jan Svoboda',
      hours: 6.5,
      activity: 'Montáž a vyrovnání nosných sloupků, nivelace a kotvení do základových patek.',
      approved: true
    },
    {
      id: 't-2',
      date: '11. 10. 2026',
      workerName: 'Pavel Kolář',
      hours: 6.5,
      activity: 'Řezání konstrukčních trámů, ošetření řezů impregnací a příprava kotevního materiálu.',
      approved: true
    },
    {
      id: 't-3',
      date: '12. 10. 2026',
      workerName: lead.assignedEmployeeName || 'Jan Svoboda',
      hours: 8.0,
      activity: 'Instalace pozednic a střešních krokví, příprava žlabových háků a svodů.',
      approved: true
    },
    {
      id: 't-4',
      date: '12. 10. 2026',
      workerName: 'Pavel Kolář',
      hours: 5.5,
      activity: 'Montáž zavětrovacích pásků a podkladních profilů pro polykarbonát.',
      approved: false
    }
  ]);

  const [newWorker, setNewWorker] = useState(lead.assignedEmployeeName || 'Jan Svoboda');
  const [newHours, setNewHours] = useState(7.5);
  const [newActivity, setNewActivity] = useState('');
  const [newDate, setNewDate] = useState('Dnes');

  const totalHours = entries.reduce((acc, e) => acc + e.hours, 0);
  const plannedHours = 48.0;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.trim()) return;

    const newEntry: TimeEntry = {
      id: 't-' + Date.now(),
      date: newDate,
      workerName: newWorker,
      hours: Number(newHours),
      activity: newActivity,
      approved: true
    };

    setEntries(prev => [newEntry, ...prev]);
    setNewActivity('');
    onNotice(`Zápis ${newHours} h pro ${newWorker} byl přidán do stavebního deníku.`);
  };

  const toggleApproval = (id: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const nextApproved = !e.approved;
      onNotice(`Výkaz práce (${e.hours} h, ${e.workerName}) ${nextApproved ? 'schválen' : 'označen k revizi'}.`);
      return { ...e, approved: nextApproved };
    }));
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top metrics summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Celkem odpracováno</span>
          <p className="text-xl font-black text-slate-900 mt-1">{totalHours.toFixed(1)} hodin</p>
          <span className="text-[10px] text-slate-500">{entries.length} zápisů ve stavebním deníku</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Plánovaný fond hodin</span>
          <p className="text-xl font-black text-[#0A84FF] mt-1">{plannedHours} hodin</p>
          <span className="text-[10px] text-emerald-600 font-bold">Zbývá {(plannedHours - totalHours).toFixed(1)} h do limitu</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Čerpání kapacity</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{Math.round((totalHours / plannedHours) * 100)} %</p>
          <span className="text-[10px] text-slate-500">V normě rozpočtu prací</span>
        </div>
      </div>

      {/* Diary Entries List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900">Záznamy práce a stavebního deníku</h2>
            <p className="text-xs text-slate-500 mt-0.5">Přehled odpracovaného času řemeslníků s popisem činností</p>
          </div>
          <button
            onClick={() => onNotice('Výpis stavebního deníku byl exportován do PDF souboru.')}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Exportovat stavební deník
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {entries.map(entry => (
            <div key={entry.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0A84FF] flex items-center justify-center font-black text-xs shrink-0">
                  <Clock className="w-4 h-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">{entry.workerName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs font-mono font-black text-[#0A84FF]">{entry.hours} h</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-[11px] text-slate-500">{entry.date}</span>
                    <button
                      onClick={() => toggleApproval(entry.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        entry.approved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {entry.approved ? '✓ Schváleno mistrem' : '⏳ K revizi'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{entry.activity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick add time log form */}
        <form onSubmit={handleAddEntry} className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap gap-2 items-center text-xs">
          <input
            type="text"
            placeholder="Pracovník..."
            value={newWorker}
            onChange={e => setNewWorker(e.target.value)}
            className="w-36 p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
          />

          <input
            type="text"
            placeholder="Datum (např. Dnes)..."
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="w-28 p-2 rounded-xl border border-slate-200 bg-white text-slate-700"
          />

          <input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            placeholder="Hodin"
            value={newHours}
            onChange={e => setNewHours(Number(e.target.value))}
            className="w-20 p-2 rounded-xl border border-slate-200 bg-white text-right font-mono"
          />

          <input
            type="text"
            placeholder="Popis provedené práce / montáže..."
            value={newActivity}
            onChange={e => setNewActivity(e.target.value)}
            className="flex-1 min-w-[200px] p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-[#0A84FF]"
          />

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Zapsat hodiny
          </button>
        </form>
      </div>
    </div>
  );
};
