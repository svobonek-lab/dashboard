import React, { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, User, AlertCircle } from 'lucide-react';
import type { Lead } from '@/entities/lead';

interface EmployeeSchedulePageProps {
  leads: Lead[];
}

export const EmployeeSchedulePage: React.FC<EmployeeSchedulePageProps> = ({ leads }) => {
  const [selectedDay, setSelectedDay] = useState(0);

  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      name: index === 0 ? 'Dnes' : index === 1 ? 'Zítra' : new Intl.DateTimeFormat('cs-CZ', { weekday: 'short' }).format(date),
      date: new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' }).format(date),
      count: index === 0 ? leads.length : 0
    };
  });

  const scheduleItems = leads.map((lead) => ({
    time: lead.preferredDate || 'Termín dle zakázky',
    title: lead.title,
    location: lead.address || lead.city || 'Adresa není zadána',
    customer: lead.customerName || 'Zákazník není uveden',
    status: lead.status === 'Completed' ? 'Dokončeno' : lead.status === 'In Progress' ? 'Probíhá' : 'Naplánováno'
  }));

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">

      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-primary" />
          Můj denní harmonogram
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Přehled plánovaných výjezdů a montáží.
        </p>
      </div>

      {/* Days carousel */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(i)}
            className={`min-w-[100px] p-3 rounded-2xl border text-center transition-all cursor-pointer ${
              selectedDay === i
                ? 'bg-brand-primary border-brand-primary text-white font-bold shadow-xs'
                : 'bg-white border-slate-200/80 text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="text-xs block font-bold">{d.name}</span>
            <span className="text-[11px] block opacity-90">{d.date}</span>
            <span className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full font-bold ${
              selectedDay === i ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {d.count} akce
            </span>
          </button>
        ))}
      </div>

      {/* Schedule Items List */}
      <div className="space-y-3">
        {scheduleItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
            Nemáte žádné přiřazené termíny. Harmonogram se zobrazí po přiřazení zakázky.
          </div>
        ) : scheduleItems.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs tabular-nums font-bold text-brand-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-primary" />
                <span>{item.time}</span>
              </span>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                item.status === 'Dokončeno' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-brand-primary-soft text-brand-primary border-brand-primary-soft'
              }`}>
                {item.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                <span>{item.location}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand-primary" />
                <span>Investor: {item.customer}</span>
              </span>

              <button className="text-brand-primary font-bold hover:underline flex items-center gap-1 cursor-pointer">
                <span>Zobrazit trasu</span>

              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
