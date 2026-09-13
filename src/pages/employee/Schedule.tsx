import React, { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, ChevronRight, User, AlertCircle } from 'lucide-react';
import { Lead } from '@/types';

interface EmployeeSchedulePageProps {
  leads: Lead[];
}

export const EmployeeSchedulePage: React.FC<EmployeeSchedulePageProps> = ({ leads }) => {
  const [selectedDay, setSelectedDay] = useState(0);

  const days = [
    { name: 'Dnes', date: 'Čtvrtek 10.9.', count: 2, active: true },
    { name: 'Zítra', date: 'Pátek 11.9.', count: 2 },
    { name: 'So', date: 'Sobota 12.9.', count: 1 },
    { name: 'Ne', date: 'Neděle 13.9.', count: 0 },
    { name: 'Po', date: 'Pondělí 14.9.', count: 3 },
  ];

  const scheduleItems = [
    { time: '08:30 - 11:30', title: 'Založení patek a kotvení', location: 'Praha 6 - Dejvice', customer: 'Pavel Horák', status: 'Dokončeno' },
    { time: '13:30 - 17:00', title: 'Montáž bioklimatické pergoly 6x4m', location: 'Praha 4 - Kunratice', customer: 'Ing. Jan Svoboda', status: 'Probíhá' },
  ];

  return (
    <div className="space-y-6 text-slate-900 font-sans pb-12">
      
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
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
                ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs' 
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
        {scheduleItems.map((item, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-blue-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{item.time}</span>
              </span>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                item.status === 'Dokončeno' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {item.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>{item.location}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Investor: {item.customer}</span>
              </span>

              <button className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                <span>Zobrazit trasu</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
