import React, { useState } from 'react';
import { Lead } from '@/types';
import { 
  HardHat, 
  MapPin, 
  User, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Camera, 
  Sparkles, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useRouter } from '../../app/router';

interface OwnerProjectsPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const OwnerProjectsPage: React.FC<OwnerProjectsPageProps> = ({ leads, onSelectLead }) => {
  const { navigate } = useRouter();
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  const projects = leads.filter(l => {
    if (filter === 'in_progress') return l.status === 'In Progress';
    if (filter === 'completed') return l.status === 'Completed';
    return l.status === 'In Progress' || l.status === 'Completed' || l.status === 'Quote';
  });

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <HardHat className="w-6 h-6 text-amber-400" />
            Realizace & Stavební projekty
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Přehled aktivních staveb v terénu, sledování milníků, čerpání rozpočtů a fotodokumentace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/quotes')}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Rozpočty & Nabídky</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Probíhající stavby</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {leads.filter(l => l.status === 'In Progress').length} staveb
          </p>
          <span className="text-[10px] text-amber-400 font-semibold mt-0.5 block">Všechny party na montážích</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rozpracovaný objem</span>
          <p className="text-2xl font-black text-green-400 mt-1">
            {leads.filter(l => l.status === 'In Progress').reduce((sum, l) => sum + (l.price || 0), 0).toLocaleString('cs-CZ')} Kč
          </p>
          <span className="text-[10px] text-green-400 font-semibold mt-0.5 block">Průměrná marže 34.2%</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Předáno investorům tento měsíc</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {leads.filter(l => l.status === 'Completed').length} zakázek
          </p>
          <span className="text-[10px] text-blue-400 font-semibold mt-0.5 block">100% podepsaných protokolů</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Všechny projekty ({projects.length})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'in_progress' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Probíhající montáže ({leads.filter(l => l.status === 'In Progress').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'completed' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Dokončené ({leads.filter(l => l.status === 'Completed').length})
        </button>
      </div>

      {/* Projects Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((project) => {
          const completedTasks = project.checklist?.filter(c => c.completed).length || 0;
          const totalTasks = project.checklist?.length || 5;
          const progressPercent = Math.round((completedTasks / totalTasks) * 100);

          return (
            <div
              key={project.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-6 shadow-lg space-y-5 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-4">
                
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      project.status === 'In Progress' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                      project.status === 'Completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {project.status === 'In Progress' ? 'Probíhá realizace' : project.status === 'Completed' ? 'Dokončeno' : 'Příprava'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5 group-hover:text-amber-400 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{project.city} • {project.address}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-green-400 font-mono">
                      {project.price?.toLocaleString('cs-CZ')} Kč
                    </p>
                    <span className="text-[10px] text-slate-500 block">Smluvní cena</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Postup stavebního deníku:</span>
                    <span className="text-amber-400 font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(15, progressPercent)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Dokončeno {completedTasks} z {totalTasks} milníků</span>
                    <span>Vedoucí: {project.assignedEmployeeName || 'Petr Novotný'}</span>
                  </div>
                </div>

                {/* Info Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-200 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-slate-700 truncate">{project.customerName}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-200 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-slate-700 truncate">{project.preferredDate || 'Září 2026'}</span>
                  </div>
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>{project.photos?.length || 4} fotografií</span>
                </div>

                <button
                  onClick={() => {
                    onSelectLead(project);
                    navigate('/leads');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>Detail stavby & Deník</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
