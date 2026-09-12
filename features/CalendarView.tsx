import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Sparkles, CloudRain, CheckCircle2, Briefcase, ChevronRight, FileText } from 'lucide-react';
import { Lead } from '../types';

interface CalendarViewProps {
  leads: Lead[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ leads }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'day'>('week');
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const days = [
    { name: 'Pondělí 7. září 2026', date: '7. zář', weather: '☀️ 21°C', rain: false },
    { name: 'Úterý 8. září 2026', date: '8. zář', weather: '⛅ 24°C', rain: false },
    { name: 'Středa 9. září 2026', date: '9. zář', weather: '⛅ 22°C', rain: false },
    { name: 'Čtvrtek 10. září 2026 (Dnes)', date: '10. zář', active: true, weather: '🌧️ 16°C', rain: true },
    { name: 'Pátek 11. září 2026', date: '11. zář', weather: '☀️ 25°C', rain: false },
    { name: 'Sobota 12. září 2026', date: '12. zář', weather: '☀️ 23°C', rain: false },
    { name: 'Neděle 13. září 2026', date: '13. zář', weather: '⛅ 20°C', rain: false }
  ];

  const handleAutoSchedule = () => {
    setIsAutoScheduling(true);
    setScheduleSuccess(false);
    setTimeout(() => {
      setIsAutoScheduling(false);
      setScheduleSuccess(true);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-20 text-slate-900 font-sans max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Týdenní harmonogram (Agenda)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Vertikální časová osa stavebních výjezdů, přiřazených part a meteorologických výstrah</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${viewMode === 'day' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Den
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${viewMode === 'week' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Týden (Agenda)
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${viewMode === 'month' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Měsíc
            </button>
          </div>

          <button
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${isAutoScheduling ? 'animate-spin' : ''}`} />
            <span>{isAutoScheduling ? 'Optimalizace...' : 'Optimalizovat trasy (AI)'}</span>
          </button>
        </div>
      </div>

      {scheduleSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Harmonogram optimalizován: Ušetřeno 48 km dojezdů part, vyřešeno vytížení řemeslníků.</span>
          </div>
          <button onClick={() => setScheduleSuccess(false)} className="text-xs font-bold text-emerald-700 hover:underline">Zavřít</button>
        </div>
      )}

      {/* Vertical Agenda Layout (Apple Reminders / Google Calendar Agenda style) */}
      <div className="space-y-8">
        {days.map((day, idx) => {
          const dayLeads = leads.filter((_, i) => i % days.length === idx);
          return (
            <div key={idx} className="space-y-4">
              {/* Sticky Date Header */}
              <div className="sticky top-16 z-20 bg-slate-50/90 backdrop-blur-md py-3 px-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${day.active ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-400'}`} />
                  <h3 className={`text-sm font-black ${day.active ? 'text-blue-900' : 'text-slate-800'}`}>{day.name}</h3>
                  {day.active && <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-700">Dnes</span>}
                </div>
                <div className="flex items-center gap-3">
                  {day.rain && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-amber-600" /> Výstraha: Déšť
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    {day.weather} • {dayLeads.length} výjezdy
                  </span>
                </div>
              </div>

              {/* Day Event Cards */}
              <div className="space-y-3 pl-6 border-l-2 border-slate-200 ml-4">
                {dayLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> 08:00 - 15:30 (7.5 hod)
                        </span>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700">
                          {lead.status}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {lead.price ? `${lead.price.toLocaleString()} Kč` : 'Dohodou'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {lead.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{lead.address}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{lead.customerName} ({lead.customerPhone})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {lead.assignedEmployeeName.charAt(0)}
                        </div>
                        <div className="text-xs pr-2">
                          <span className="text-slate-500 block text-[10px]">Přiřazená parta</span>
                          <span className="font-bold text-slate-900">{lead.assignedEmployeeName}</span>
                        </div>
                      </div>
                    </div>

                    {lead.description && (
                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <p className="line-clamp-1">{lead.description}</p>
                      </div>
                    )}
                  </div>
                ))}

                {dayLeads.length === 0 && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    Žádné naplánované výjezdy pro tento den.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
