import React, { useState } from 'react';
import { Lead } from '@/types';
import { 
  Briefcase, 
  MapPin, 
  Phone, 
  Navigation, 
  Camera, 
  CalendarClock,
} from 'lucide-react';
import { useRouter } from '../../app/router';
import { filterEmployeeJobs } from '../../app/leadAttachments';

interface EmployeeJobsPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const EmployeeJobsPage: React.FC<EmployeeJobsPageProps> = ({ leads, onSelectLead }) => {
  const { navigate } = useRouter();
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'completed'>('today');

  // App supplies only jobs assigned to the authenticated employee.
  const myJobs = leads;
  const displayedJobs = filterEmployeeJobs(myJobs, filter);
  const dateLabel = (job: Lead) => job.preferredDate
    ? new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(job.preferredDate))
    : 'Termín není naplánovaný';

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-primary" />
            Moje zakázky & montáže
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Seznam přiřazených staveb a montáží na tento týden.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-brand-primary-soft text-brand-primary text-xs font-bold border border-brand-primary-soft">
          {myJobs.length} aktivních
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
        <button
          onClick={() => setFilter('today')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'today' ? 'bg-white text-brand-primary shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Dnešní výjezdy ({filterEmployeeJobs(myJobs, 'today').length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'upcoming' ? 'bg-white text-brand-primary shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Plánované ({filterEmployeeJobs(myJobs, 'upcoming').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filter === 'completed' ? 'bg-white text-brand-primary shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Předané ({filterEmployeeJobs(myJobs, 'completed').length})
        </button>
      </div>

      {/* Jobs Cards */}
      <div className="space-y-4">
        {displayedJobs.map((job, idx) => (
          <div
            key={job.id}
            className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-4 hover:border-brand-primary-soft transition-colors"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-primary-soft text-brand-primary border border-brand-primary-soft">
                  <CalendarClock className="mr-1 inline h-3 w-3" />{dateLabel(job)}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">{job.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                  <span>{job.city} • {job.address}</span>
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-brand-primary">
                #{idx + 1}
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 block">Investor / Kontakt:</span>
                <span className="font-bold text-slate-900">{job.customerName}</span>
              </div>
              <a
                href={`tel:${job.customerPhone}`}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-1.5 border border-emerald-200 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Zavolat</span>
              </a>
            </div>

            {/* Quick Action Touch Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(job.address + ', ' + job.city)}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200/80"
              >
                <Navigation className="w-4 h-4 text-brand-primary" />
                <span>Navigace</span>
              </a>

              <button
                onClick={() => { onSelectLead(job); navigate('/employee/photos'); }}
                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200/80"
              >
                <Camera className="w-4 h-4 text-brand-primary" />
                <span>Vyfotit</span>
              </button>

            </div>
          </div>
        ))}
        {!displayedJobs.length && <div className="workspace-empty-state px-6 py-12 text-center text-sm text-slate-500">V této záložce nejsou žádné přiřazené zakázky.</div>}
      </div>

    </div>
  );
};
