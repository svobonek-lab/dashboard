import React, { useState } from 'react';
import { MapPin, Navigation, Sparkles, CheckCircle2, Clock, Shield, AlertTriangle, Zap } from 'lucide-react';
import { Lead, CompanyBranding } from '../types';

interface MapViewProps {
  leads: Lead[];
  branding: CompanyBranding;
  onSelectLead: (lead: Lead) => void;
}

export const MapView: React.FC<MapViewProps> = ({ leads, branding, onSelectLead }) => {
  const [selectedPin, setSelectedPin] = useState<Lead | null>(leads[0] || null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(false);

  const handleOptimizeRoute = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimizedRoute(true);
    }, 900);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-500';
      case 'Contacted': return 'bg-indigo-500';
      case 'Quote': return 'bg-amber-500';
      case 'In Progress': return 'bg-emerald-500';
      case 'Completed': return 'bg-purple-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="space-y-6 pb-16 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Mapa výjezdů & lokalizace staveb</h2>
          <p className="text-xs text-slate-400 mt-0.5">Optimalizace tras řemeslnických part, vytížení zón a dispečink v regionu {branding.city}.</p>
        </div>

        <button
          onClick={handleOptimizeRoute}
          disabled={isOptimizing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md transition-all disabled:opacity-50"
        >
          <Navigation className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
          <span>{isOptimizing ? 'AI propočítává trasy...' : optimizedRoute ? 'Trasy optimalizovány (úspora 41 min)' : 'Optimalizovat denní výjezdy'}</span>
        </button>
      </div>

      {/* Route Optimization Savings Banner (shown after click) */}
      {optimizedRoute && (
        <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-xl border border-amber-500/40 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">AI Optimalizace tras úspěšně dokončena</h4>
              <p className="text-xs text-amber-300">Přeplánovány dojezdové koridory všech aktivních part v regionu {branding.city}.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
            <div>⏱️ Ušetřený čas: <span className="text-amber-400">41 min</span></div>
            <div>⛽ Ušetřené palivo: <span className="text-amber-400">4.2 L</span></div>
            <div>📍 Zkrácení tras: <span className="text-amber-400">32 km</span></div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Canvas Mockup with Heat Zones & Glowing Emergency Pin */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-6 relative overflow-hidden h-[580px] flex items-center justify-center shadow-xl">
          {/* Grid background styling */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

          {/* Technician Heatmap Zones */}
          <div className="absolute top-12 left-12 w-48 h-48 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none border border-emerald-500/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/80 px-2.5 py-1 rounded-full">Zóna A: Volná kapacita</span>
          </div>

          <div className="absolute bottom-16 right-16 w-56 h-56 rounded-full bg-amber-500/15 blur-2xl pointer-events-none border border-amber-500/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-950/80 px-2.5 py-1 rounded-full">Zóna B: Aktivní montáž</span>
          </div>

          <div className="absolute top-20 right-20 w-40 h-40 rounded-full bg-rose-500/20 blur-2xl pointer-events-none border border-rose-500/40 flex items-center justify-center">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest bg-rose-950/80 px-2.5 py-1 rounded-full">Zóna C: Vyčerpáno</span>
          </div>

          {/* Simulated Map Pins */}
          {leads.map((lead, idx) => {
            const topPositions = [20, 40, 65, 80, 45, 25];
            const leftPositions = [25, 75, 35, 82, 55, 60];
            const top = topPositions[idx % topPositions.length];
            const left = leftPositions[idx % leftPositions.length];
            const isSelected = selectedPin?.id === lead.id;
            const isEmergency = idx === 0; // First lead acts as glowing emergency lead

            return (
              <button
                key={lead.id}
                onClick={() => setSelectedPin(lead)}
                className={`absolute p-2.5 rounded-2xl flex items-center gap-2 shadow-2xl transition-all transform hover:scale-110 ${
                  isEmergency ? 'ring-4 ring-rose-500/60 bg-rose-950 text-white border border-rose-500 animate-pulse z-30' :
                  isSelected ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/40 font-bold z-20' : 'bg-slate-900/95 text-white border border-slate-700 z-10'
                }`}
                style={{ top: `${top}%`, left: `${left}%` }}
              >
                {isEmergency && <Zap className="w-3.5 h-3.5 text-rose-400 animate-ping" />}
                <div className={`w-3.5 h-3.5 rounded-full ${isEmergency ? 'bg-rose-500' : getStatusColor(lead.status)} ring-2 ring-white`} />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold truncate max-w-[120px]">{lead.customerName}</p>
                  <p className={`text-[10px] ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>{(lead.price / 1000).toFixed(0)}k Kč</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pin / Lead Detail Sidebar */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between shadow-md text-slate-100">
          {selectedPin ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                  selectedPin.status === 'In Progress' ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-amber-950 border border-amber-800 text-amber-400'
                }`}>
                  {selectedPin.status}
                </span>
                <span className="text-xs font-bold text-amber-400 font-mono">{(selectedPin.price / 1000).toFixed(0)} tis. Kč</span>
              </div>

              <img src={selectedPin.thumbnail} alt="" className="w-full h-40 rounded-2xl object-cover border border-slate-800" />

              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedPin.title}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> {selectedPin.address}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Zákazník:</span>
                  <span className="font-semibold text-slate-200">{selectedPin.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Odpovědný mistr:</span>
                  <span className="font-semibold text-amber-400">{selectedPin.assignedEmployeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Termín realizace:</span>
                  <span className="font-semibold text-slate-200">{selectedPin.preferredDate}</span>
                </div>
              </div>

              <button
                onClick={() => onSelectLead(selectedPin)}
                className="w-full py-3 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md transition-all"
              >
                Otevřít detail zakázky
              </button>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 text-slate-500 text-xs">
              Klepněte na špendlík na mapě pro zobrazení zakázky.
            </div>
          )}

          {optimizedRoute && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Optimalizováno AI: Ušetřeno 32 km dojezdu a 41 minut času techniků.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

