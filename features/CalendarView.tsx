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
    { name: 'Pondělí', date: '7. zář', weather: '☀️ 21°C', rain: false },
    { name: 'Úterý', date: '8. zář', weather: '⛅ 24°C', rain: false },
    { name: 'Středa', date: '9. zář', weather: '⛅ 22°C', rain: false },
    { name: 'Čtvrtek', date: '10. zář (Dnes)', active: true, weather: '🌧️ 16°C', rain: true },
    { name: 'Pátek', date: '11. zář', weather: '☀️ 25°C', rain: false },
    { name: 'Sobota', date: '12. zář', weather: '☀️ 23°C', rain: false },
    { name: 'Neděle', date: '13. zář', weather: '⛅ 20°C', rain: false }
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
    setPredictionMessage(`Předpokládaný příjezd party: 09:15 • Ušetřeno 14 km přejezdů • Specializace zedník odpovídá zadání.`);
  };

  return (
    <div className="space-y-6 pb-16 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Týdenní dispečink & harmonogram staveb</h2>
          <p className="text-xs text-slate-400">Automatické plánování tras part, specializace řemesel a napojení na předpověď počasí pro exteriérové práce</p>
        </div>

        <button
          onClick={handleAutoSchedule}
          disabled={isAutoScheduling}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg transition-all flex items-center gap-2"
        >
          <Sparkles className={`w-4 h-4 ${isAutoScheduling ? 'animate-spin' : ''}`} />
          <span>{isAutoScheduling ? 'Optimalizace tras part...' : 'Optimalizovat týden (AI)'}</span>
        </button>
      </div>

      {scheduleSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-800 p-4 rounded-2xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Harmonogram optimalizován: Ušetřeno 48 km dojezdů part, vyřešeno vytížení všech 5 řemeslníků.</span>
          </div>
          <button onClick={() => setScheduleSuccess(false)} className="text-xs font-bold text-emerald-400 hover:underline">Zavřít</button>
        </div>
      )}

      {predictionMessage && (
        <div className="bg-slate-900 border border-amber-500/50 p-3.5 rounded-2xl text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span><strong>Predikce přesunu ({draggedJobId}):</strong> {predictionMessage}</span>
          </div>
          <button onClick={() => setPredictionMessage(null)} className="text-xs font-bold text-amber-400 hover:underline">Zavřít</button>
        </div>
      )}

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day, idx) => {
          const dayLeads = leads.filter((_, i) => i % days.length === idx);
          return (
            <div key={idx} className={`rounded-2xl p-4 flex flex-col min-h-[550px] border ${
              day.active ? 'bg-slate-900 border-amber-500/60 shadow-lg' : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className={`text-xs font-bold block ${day.active ? 'text-amber-400' : 'text-slate-200'}`}>{day.name}</span>
                  <span className="text-[11px] text-slate-500">{day.date}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">{day.weather}</span>
                </div>
              </div>

              {/* Rain Warning for Rain-Sensitive Work */}
              {day.rain && (
                <div className="mb-3 p-2.5 rounded-xl bg-amber-950/70 border border-amber-800 text-[10px] text-amber-300 space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <CloudRain className="w-3.5 h-3.5 text-amber-400" />
                    <span>Výstraha počasí</span>
                  </div>
                  <p>Střechy a venkovní tesařské práce citlivé na déšť. Doporučeno přesunout na pátek.</p>
                </div>
              )}

              <div className="space-y-3 flex-1">
                {dayLeads.map(lead => {
                  const isRainSensitive = lead.title.toLowerCase().includes('roof') || lead.title.toLowerCase().includes('přístřešek') || lead.title.toLowerCase().includes('pergola') || lead.title.toLowerCase().includes('fasád');
                  return (
                    <div 
                      key={lead.id} 
                      draggable 
                      onDragStart={() => handleSimulateMove(lead.title)}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 shadow-sm space-y-2 hover:border-amber-500/70 transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                          07:30 - 15:30
                        </span>
                        {isRainSensitive && day.rain && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950 border border-rose-800 text-rose-400 flex items-center gap-0.5" title="Riziko deště pro venkovní práce">
                            <AlertTriangle className="w-3 h-3" /> Déšť
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-100 line-clamp-2">{lead.title}</p>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" /> {lead.assignedEmployeeName.split(' ')[0]}
                        </span>
                        <span className="font-mono font-semibold text-amber-400">{(lead.price / 1000).toFixed(0)} tis. Kč</span>
                      </div>
                    </div>
                  );
                })}

                {dayLeads.length === 0 && (
                  <div className="h-32 flex items-center justify-center text-[11px] text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Žádný výjezd
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

