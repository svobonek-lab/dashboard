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
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-400" />
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
            className={`min-w-[100px] p-3 rounded-2xl border text-center transition-all ${
              selectedDay === i 
                ? 'bg-green-500 border-green-400 text-slate-950 font-black shadow-lg shadow-green-500/20' 
                : 'bg-[#111726] border-slate-200 text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="text-xs block">{d.name}</span>
            <span className="text-[11px] block opacity-80">{d.date}</span>
            <span className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full font-bold ${
              selectedDay === i ? 'bg-slate-50 text-green-400' : 'bg-slate-800 text-slate-700'
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
            className="bg-[#111726] border border-slate-200 rounded-3xl p-5 shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-green-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.time}</span>
              </span>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                item.status === 'Dokončeno' ? 'bg-slate-800 text-slate-500' : 'bg-green-500/20 text-green-400 border border-green-500/30'
              }`}>
                {item.status}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{item.location}</span>
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Investor: {item.customer}</span>
              </span>

              <button className="text-green-400 font-bold hover:underline flex items-center gap-1">
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
