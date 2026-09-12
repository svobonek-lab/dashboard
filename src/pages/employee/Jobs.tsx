import React, { useState } from 'react';
import { Lead } from '@/types';
import { 
  Briefcase, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Camera, 
  Clock, 
  CheckSquare, 
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useRouter } from '../../app/router';

interface EmployeeJobsPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const EmployeeJobsPage: React.FC<EmployeeJobsPageProps> = ({ leads, onSelectLead }) => {
  const { navigate } = useRouter();
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'completed'>('today');

  // Filter assigned jobs (excluding unassigned or general)
  const myJobs = leads.slice(0, 4);

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-green-400" />
            Moje zakázky & montáže
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Seznam přiřazených staveb a montáží na tento týden.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
          {myJobs.length} aktivních
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-[#111726] p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setFilter('today')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'today' ? 'bg-green-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Dnešní výjezdy (2)
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'upcoming' ? 'bg-green-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Plánované (2)
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'completed' ? 'bg-green-500 text-slate-950 shadow-md' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Předané
        </button>
      </div>

      {/* Jobs Cards */}
      <div className="space-y-4">
        {myJobs.map((job, idx) => (
          <div
            key={job.id}
            className="bg-[#111726] border border-slate-200 rounded-3xl p-5 shadow-lg space-y-4 hover:border-green-500/40 transition-colors"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {idx === 0 ? 'Dnes 13:30 (Aktivní)' : 'Zítra 08:00'}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">{job.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{job.city} • {job.address}</span>
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-green-400">
                #{idx + 1}
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-[#0B0F19] p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 block">Investor / Kontakt:</span>
                <span className="font-bold text-slate-900">{job.customerName}</span>
              </div>
              <a
                href={`tel:${job.customerPhone}`}
                className="px-3 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 font-bold flex items-center gap-1.5 border border-green-500/30"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Zavolat</span>
              </a>
            </div>

            {/* Quick Action Touch Buttons (Large > 44px) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.address + ', ' + job.city)}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Navigace</span>
              </a>

              <button
                onClick={() => navigate('/employee/photos')}
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Camera className="w-4 h-4 text-green-400" />
                <span>Vyfotit</span>
              </button>

              <button
                onClick={() => navigate('/employee/checklist')}
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckSquare className="w-4 h-4 text-amber-400" />
                <span>Checklist</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
