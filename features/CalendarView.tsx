import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, User, Sparkles, CloudRain, Sun, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Lead } from '../types';

interface CalendarViewProps {
  leads: Lead[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ leads }) => {
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [predictionMessage, setPredictionMessage] = useState<string | null>(null);

  const days = [
    { name: 'Monday', date: 'Sep 7', weather: '☀️ 21°C', rain: false },
    { name: 'Tuesday', date: 'Sep 8', weather: '⛅ 24°C', rain: false },
    { name: 'Wednesday', date: 'Sep 9', weather: '⛅ 22°C', rain: false },
    { name: 'Thursday', date: 'Sep 10 (Today)', active: true, weather: '🌧️ 16°C', rain: true },
    { name: 'Friday', date: 'Sep 11', weather: '☀️ 25°C', rain: false },
    { name: 'Saturday', date: 'Sep 12', weather: '☀️ 23°C', rain: false },
    { name: 'Sunday', date: 'Sep 13', weather: '⛅ 20°C', rain: false }
  ];

  const handleAutoSchedule = () => {
    setIsAutoScheduling(true);
    setScheduleSuccess(false);
    setTimeout(() => {
      setIsAutoScheduling(false);
      setScheduleSuccess(true);
    }, 1200);
  };

  const handleSimulateMove = (leadTitle: string) => {
    setDraggedJobId(leadTitle);
    setPredictionMessage(`Predicted arrival: 09:15 AM • Minimized travel by 14 km • Technician specialized for this job.`);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Construction Planner</h2>
          <p className="text-xs text-slate-500">AI Auto Schedule (Minimize travel, match specialization, respect workload) & weather integration</p>
        </div>

        <button
          onClick={handleAutoSchedule}
          disabled={isAutoScheduling}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2"
        >
          <Sparkles className={`w-4 h-4 ${isAutoScheduling ? 'animate-spin' : ''}`} />
          <span>{isAutoScheduling ? 'AI Optimizing Week...' : 'Auto Schedule Week'}</span>
        </button>
      </div>

      {scheduleSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>AI Auto Schedule applied: Minimized transit by 48 km, matched all technician specializations, and balanced workload across 5 staff.</span>
          </div>
          <button onClick={() => setScheduleSuccess(false)} className="text-xs font-bold text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {predictionMessage && (
        <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl text-blue-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span><strong>Drag Prediction ({draggedJobId}):</strong> {predictionMessage}</span>
          </div>
          <button onClick={() => setPredictionMessage(null)} className="text-xs font-bold text-blue-700 hover:underline">Close</button>
        </div>
      )}

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day, idx) => {
          const dayLeads = leads.filter((_, i) => i % days.length === idx);
          return (
            <div key={idx} className={`rounded-2xl p-4 flex flex-col min-h-[550px] border ${
              day.active ? 'bg-blue-50/40 border-blue-200 shadow-xs' : 'bg-white border-slate-200'
            }`}>
              <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{day.name}</span>
                  <span className="text-[11px] text-slate-500">{day.date}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">{day.weather}</span>
                </div>
              </div>

              {/* Rain Warning for Rain-Sensitive Work */}
              {day.rain && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <CloudRain className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rain Warning</span>
                  </div>
                  <p>Roof & outdoor timber work sensitive to rain. AI recommends rescheduling.</p>
                </div>
              )}

              <div className="space-y-3 flex-1">
                {dayLeads.map(lead => {
                  const isRainSensitive = lead.title.toLowerCase().includes('roof') || lead.title.toLowerCase().includes('přístřešek') || lead.title.toLowerCase().includes('pergola');
                  return (
                    <div 
                      key={lead.id} 
                      draggable 
                      onDragStart={() => handleSimulateMove(lead.title)}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 hover:border-blue-400 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          09:00 - 13:00
                        </span>
                        {isRainSensitive && day.rain && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5" title="Rain sensitive work on rainy day">
                            <AlertTriangle className="w-3 h-3" /> Rain Risk
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900 line-clamp-2">{lead.title}</p>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {lead.assignedEmployeeName.split(' ')[0]}
                        </span>
                        <span className="font-mono font-semibold text-slate-700">{(lead.price / 1000).toFixed(0)}k CZK</span>
                      </div>
                    </div>
                  );
                })}

                {dayLeads.length === 0 && (
                  <div className="h-32 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No scheduled jobs
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

