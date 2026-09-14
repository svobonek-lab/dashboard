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
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${viewMode === 'day' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Den
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${viewMode === 'week' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Týden (Agenda)
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${viewMode === 'month' ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Měsíc
            </button>
          </div>

          <button
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${isAutoScheduling ? 'animate-spin' : ''}`} />
            <span>{isAutoScheduling ? 'Optimalizace...' : 'Optimalizovat trasy (AI)'}</span>
          </button>
        </div>
      </div>

      {scheduleSuccess && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-2xl text-green-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>Harmonogram optimalizován: Ušetřeno 48 km dojezdů part, vyřešeno vytížení řemeslníků.</span>
          </div>
          <button onClick={() => setScheduleSuccess(false)} className="text-xs font-bold text-green-700 hover:underline">Zavřít</button>
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
                  <div className={`w-3.5 h-3.5 rounded-full ${day.active ? 'bg-brand-primary ring-4 ring-brand-primary-soft' : 'bg-slate-400'}`} />
                  <h3 className={`text-sm font-black ${day.active ? 'text-text' : 'text-slate-800'}`}>{day.name}</h3>
                  {day.active && <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-brand-primary-soft text-brand-primary">Dnes</span>}
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
              <div className="space-y-4 pl-6 border-l-[3px] border-slate-200 ml-4 relative">
                {dayLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-4 group cursor-pointer relative"
                  >
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[31px] top-6 w-4 h-4 rounded-full border-4 border-white ${lead.status === 'Completed' ? 'bg-green-500' : lead.status === 'In Progress' ? 'bg-purple-500' : 'bg-brand-primary'}`} />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-slate-50 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> 08:00 - 15:30 (7.5 hod)
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                          lead.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                          lead.status === 'In Progress' ? 'bg-purple-100 text-purple-700' : 
                          'bg-brand-primary-soft text-brand-primary'
                        }`}>
                          {lead.status}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-black text-slate-900">
                        {lead.price ? `${lead.price.toLocaleString()} Kč` : 'Dohodou'}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                          {lead.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{lead.address}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{lead.customerName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-100 shrink-0 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                        <div className="relative">
                          <img 
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${lead.assignedEmployeeName}&backgroundColor=e2e8f0`} 
                            alt={lead.assignedEmployeeName}
                            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                          />
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>
                        <div className="text-xs pr-3">
                          <span className="text-slate-500 block text-[10px] font-semibold uppercase tracking-wider">Přiřazená parta</span>
                          <span className="font-black text-slate-900">{lead.assignedEmployeeName}</span>
                        </div>
                      </div>
                    </div>

                    {lead.description && (
                      <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-start gap-2.5">
                        <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <p className="line-clamp-2 leading-relaxed">{lead.description}</p>
                      </div>
                    )}
                  </div>
                ))}

                {dayLeads.length === 0 && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500 relative">
                    <div className="absolute -left-[31px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white bg-slate-200" />
                    Žádné naplánované výjezdy pro tento den. Volná kapacita.
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
