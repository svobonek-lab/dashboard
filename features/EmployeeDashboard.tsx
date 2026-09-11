import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Navigation, 
  CheckCircle, 
  Car, 
  Camera, 
  Mic, 
  Sparkles, 
  Wifi,
  WifiOff,
  CloudUpload,
  AlertTriangle,
  Receipt,
  FileText,
  Check,
  Maximize2,
  Minimize2,
  PenTool,
  Ruler,
  FileCheck,
  UploadCloud,
  Send,
  RefreshCw
} from 'lucide-react';
import { Lead, CompanyBranding } from '../types';

interface EmployeeDashboardProps {
  leads: Lead[];
  branding: CompanyBranding;
  onOpenVoiceNotes: () => void;
  onSelectLead: (lead: Lead) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  leads,
  branding,
  onOpenVoiceNotes,
  onSelectLead
}) => {
  const [activeJobStatus, setActiveJobStatus] = useState<'Driving' | 'Arrived' | 'Finished'>('Arrived');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(3);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fullscreen Site Visit Mode (Feature 7)
  const [isSiteVisitMode, setIsSiteVisitMode] = useState(false);
  const [gpsVerified, setGpsVerified] = useState(true);

  // 5-point Checklist State
  const [checklist, setChecklist] = useState({
    measurements: false,
    photos: true,
    voiceNotes: true,
    customerSignature: false,
    materialNotes: false
  });

  const [measurementsData, setMeasurementsData] = useState({
    width: '4.5 m',
    length: '6.2 m',
    height: '2.8 m',
    slope: '7°'
  });

  const [materialNotesText, setMaterialNotesText] = useState(
    '12x dubový trám 140x140x4000mm, kotvení do betonového základu H-kotvy, spojovací materiál Würth M16.'
  );

  const [signatureDone, setSignatureDone] = useState(false);
  const [quoteGeneratedNotice, setQuoteGeneratedNotice] = useState<string | null>(null);
  
  // Voice Notes State
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedNotes, setTranscribedNotes] = useState<string[]>([
    "Zákazník požaduje dodatečné 2 LED světla na jižní fasádu. Materiál připraven v autě.",
    "Dokončeno usazení hlavních nosných trámů, beton schnul rychle."
  ]);

  // Material Receipt Scanner State
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<{ supplier: string; price: number; vat: number; item: string } | null>(null);

  // Before / During / After Timeline State
  const [timelinePhotos, setTimelinePhotos] = useState<{ id: string; stage: 'Before' | 'During' | 'After'; url: string; time: string }[]>([
    { id: '1', stage: 'Before', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f2445?auto=format&fit=crop&w=400&q=80', time: '08:15 AM' },
    { id: '2', stage: 'During', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80', time: '11:30 AM' }
  ]);

  const activeLead = leads[0] || leads[1];

  const handleAddPhoto = (stage: 'Before' | 'During' | 'After') => {
    const newPhoto = {
      id: 'photo-' + Date.now(),
      stage,
      url: activeLead.thumbnail,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setTimelinePhotos([...timelinePhotos, newPhoto]);
    setChecklist(prev => ({ ...prev, photos: true }));
    if (isOfflineMode) {
      setOfflineQueueCount(prev => prev + 1);
    }
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const text = "Zkontrolováno kotvení střešní konstrukce, vše v pořádku podle výkresu.";
      setTranscribedNotes([text, ...transcribedNotes]);
      setChecklist(prev => ({ ...prev, voiceNotes: true }));
    }, 2500);
  };

  const handleScanReceipt = () => {
    setIsScanningReceipt(true);
    setTimeout(() => {
      setIsScanningReceipt(false);
      setScannedReceipt({
        supplier: "Bauhaus CZ k.s.",
        price: 3450,
        vat: 21,
        item: "Spojovací nerezový materiál & vruty 8x120"
      });
    }, 2000);
  };

  const handleSyncOffline = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setOfflineQueueCount(0);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }, 1200);
  };

  const handleGenerateQuoteFromField = () => {
    setQuoteGeneratedNotice(`Cenová nabídka byla automaticky vygenerována na základě zaměření (${measurementsData.width} x ${measurementsData.length}) a odeslána do systému!`);
    setTimeout(() => {
      setQuoteGeneratedNotice(null);
      setIsSiteVisitMode(false);
      onSelectLead(activeLead);
    }, 2500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Fullscreen Site Visit Mode Modal (Feature 7) */}
      {isSiteVisitMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-y-auto animate-in fade-in">
          {/* Top Bar */}
          <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Site Visit Mode</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                    Live na stavbě
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{activeLead.title} • {activeLead.customerName}</p>
              </div>
            </div>

            <button
              onClick={() => setIsSiteVisitMode(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Ukončit režim</span>
            </button>
          </div>

          <div className="p-6 max-w-2xl mx-auto w-full space-y-6 flex-1">
            {/* GPS Confirmation Banner */}
            <div className="bg-emerald-950/80 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">GPS potvrzení příjezdu</h4>
                  <p className="text-xs text-emerald-100 font-semibold">Technik dorazil na místo zakázky ({activeLead.address})</p>
                  <p className="text-[10px] text-emerald-400/80 mt-0.5">Přesnost GPS: 4 metry • Zaznamenáno v 08:14</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase">
                Potvrzeno
              </span>
            </div>

            {/* Checklist Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">Interaktivní Checklist technika</h4>
                <p className="text-xs text-slate-400">Splňte kroky před zahájením a vygenerováním nabídky</p>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800">
                {Object.values(checklist).filter(Boolean).length} / 5 splněno
              </span>
            </div>

            {/* Checklist Items */}
            <div className="space-y-4">
              {/* 1. Measurements */}
              <div className={`p-4 rounded-2xl border transition-all ${
                checklist.measurements ? 'bg-slate-900/90 border-emerald-500/40' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Ruler className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-bold text-white">1. Zaměření rozměrů (Measurements)</span>
                  </div>
                  <button
                    onClick={() => setChecklist(prev => ({ ...prev, measurements: !prev.measurements }))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                      checklist.measurements ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {checklist.measurements ? 'Hotovo' : 'Označit splněno'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Šířka (Width)</label>
                    <input
                      type="text"
                      value={measurementsData.width}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, width: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Délka (Length)</label>
                    <input
                      type="text"
                      value={measurementsData.length}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, length: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Výška (Height)</label>
                    <input
                      type="text"
                      value={measurementsData.height}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, height: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Sklon střechy</label>
                    <input
                      type="text"
                      value={measurementsData.slope}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, slope: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Photos */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-bold text-white">2. Fotodokumentace (Photos)</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAddPhoto('Before')} className="px-2.5 py-1 bg-blue-600/30 text-blue-300 border border-blue-500/30 hover:bg-blue-600/50 rounded-lg text-[10px] font-bold">+ Před</button>
                    <button onClick={() => handleAddPhoto('During')} className="px-2.5 py-1 bg-amber-600/30 text-amber-300 border border-amber-500/30 hover:bg-amber-600/50 rounded-lg text-[10px] font-bold">+ Během</button>
                    <button onClick={() => handleAddPhoto('After')} className="px-2.5 py-1 bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/50 rounded-lg text-[10px] font-bold">+ Po</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {timelinePhotos.map(p => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden border border-slate-800 aspect-video">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-bold uppercase text-white">{p.stage}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Voice Notes */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mic className="w-5 h-5 text-rose-400" />
                    <span className="text-sm font-bold text-white">3. Hlasové poznámky (Voice Notes)</span>
                  </div>
                  <button
                    onClick={handleStartRecording}
                    disabled={isRecording}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {isRecording ? 'Nahrávám...' : 'Nahrát poznámku'}
                  </button>
                </div>
                <p className="text-xs text-slate-300 italic bg-slate-950 p-3 rounded-xl border border-slate-800">
                  "{transcribedNotes[0]}"
                </p>
              </div>

              {/* 4. Customer Signature */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PenTool className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-bold text-white">4. Podpis zákazníka na místě (Customer Signature)</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    signatureDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {signatureDone ? 'Podepsáno' : 'Čeká na podpis'}
                  </span>
                </div>
                
                {/* Touch Signature Pad Canvas Simulation */}
                <div 
                  onClick={() => {
                    setSignatureDone(true);
                    setChecklist(prev => ({ ...prev, customerSignature: true }));
                  }}
                  className="h-28 rounded-2xl bg-slate-950 border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-blue-500/50 transition-all relative overflow-hidden"
                >
                  {signatureDone ? (
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="font-serif italic text-2xl text-purple-300 tracking-widest">{activeLead.customerName}</span>
                      <span className="text-[9px] text-emerald-400 flex items-center gap-1 font-mono">
                        <Check className="w-3 h-3" /> Digitálně ověřeno s časovým razítkem (08:22)
                      </span>
                    </div>
                  ) : (
                    <>
                      <PenTool className="w-6 h-6 text-slate-600 mb-1" />
                      <span className="text-xs font-semibold">Klikněte pro podpis klienta na displeji</span>
                      <span className="text-[10px] text-slate-600">Dotykový podpis pro potvrzení zaměření</span>
                    </>
                  )}
                </div>
              </div>

              {/* 5. Material Notes */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold text-white">5. Materiálové specifikace (Material Notes)</span>
                  </div>
                  <button
                    onClick={() => setChecklist(prev => ({ ...prev, materialNotes: !prev.materialNotes }))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      checklist.materialNotes ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {checklist.materialNotes ? 'Uloženo' : 'Potvrdit'}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={materialNotesText}
                  onChange={(e) => setMaterialNotesText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Prominent One-Button: Generate Quote */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <button
                onClick={handleGenerateQuoteFromField}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:opacity-95 text-white font-extrabold text-base shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
              >
                <Sparkles className="w-5 h-5" />
                <span>Generate Quote (Vytvořit cenovou nabídku na klíč)</span>
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Přenese rozměry {measurementsData.width} × {measurementsData.length}, fotky i materiál přímo do PDF nabídky.
              </p>
            </div>

            {quoteGeneratedNotice && (
              <div className="p-4 bg-emerald-900 border border-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-5 h-5 text-emerald-300" />
                <span>{quoteGeneratedNotice}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee Header & Offline-First Toggle / Queue */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Petr Novotný"
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500"
            />
            <div>
              <h2 className="text-lg font-bold">Petr Novotný</h2>
              <p className="text-xs text-slate-400">Střechy & Tesařské práce • {branding.name}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isOfflineMode 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              <span>{isOfflineMode ? 'Offline Mode' : 'Online Sync'}</span>
            </button>
            {offlineQueueCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-300 font-semibold bg-amber-950 px-2 py-0.5 rounded-md border border-amber-800">
                  ⏳ {offlineQueueCount} položek ve frontě
                </span>
                <button
                  onClick={handleSyncOffline}
                  disabled={isSyncing}
                  className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Sync</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Launch Site Visit Mode Button */}
        <button
          onClick={() => setIsSiteVisitMode(true)}
          className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Otevřít Site Visit Mode (Zaměření na stavbě & Podpis)</span>
        </button>
      </div>

      {/* Today's Jobs Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-100">Dnešní přiřazené zakázky (2)</h3>
        <span className="text-xs font-semibold text-slate-400">10. září 2026</span>
      </div>

      {/* Large Active Job Card */}
      {activeLead && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-2">
                Aktivní zakázka #1
              </span>
              <h4 className="text-xl font-extrabold text-slate-100">{activeLead.title}</h4>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> {activeLead.address}
              </p>
            </div>
            <img src={activeLead.thumbnail} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-slate-800 shadow-md" />
          </div>

          {/* Contact & Navigation Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href={`tel:${activeLead.customerPhone}`}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-3 text-xs font-semibold text-slate-200"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-normal">Zavolat zákazníkovi</p>
                <p className="truncate text-sm font-bold text-slate-100">{activeLead.customerName}</p>
              </div>
            </a>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(activeLead.address)}`}
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-3 text-xs font-semibold text-slate-200"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-normal">Navigovat na stavbu</p>
                <p className="text-sm font-bold text-slate-100">Google Maps</p>
              </div>
            </a>
          </div>

          {/* Status Buttons */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stav v terénu</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveJobStatus('Driving')}
                className={`py-4 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 border ${
                  activeJobStatus === 'Driving'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Car className="w-5 h-5" />
                <span>Na cestě</span>
              </button>
              <button
                onClick={() => setActiveJobStatus('Arrived')}
                className={`py-4 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 border ${
                  activeJobStatus === 'Arrived'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span>Na místě (GPS)</span>
              </button>
              <button
                onClick={() => setActiveJobStatus('Finished')}
                className={`py-4 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 border ${
                  activeJobStatus === 'Finished'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>Dokončeno</span>
              </button>
            </div>
          </div>

          {/* Before During After Chronological Photo Timeline */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">Fotodokumentace (Před / Během / Po)</h5>
              <div className="flex gap-1">
                <button onClick={() => handleAddPhoto('Before')} className="px-2 py-1 bg-blue-950 text-blue-400 border border-blue-800/80 hover:bg-blue-900 rounded-lg text-[10px] font-bold">+ Před</button>
                <button onClick={() => handleAddPhoto('During')} className="px-2 py-1 bg-amber-950 text-amber-400 border border-amber-800/80 hover:bg-amber-900 rounded-lg text-[10px] font-bold">+ Během</button>
                <button onClick={() => handleAddPhoto('After')} className="px-2 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800/80 hover:bg-emerald-900 rounded-lg text-[10px] font-bold">+ Po</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['Before', 'During', 'After'].map((stageName) => {
                const stagePhotos = timelinePhotos.filter(p => p.stage === stageName);
                return (
                  <div key={stageName} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded block text-center border ${
                      stageName === 'Before' ? 'bg-blue-950/80 border-blue-800 text-blue-400' :
                      stageName === 'During' ? 'bg-amber-950/80 border-amber-800 text-amber-400' : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                    }`}>
                      {stageName === 'Before' ? 'Před montáží' : stageName === 'During' ? 'V průběhu' : 'Hotové dílo'}
                    </span>
                    {stagePhotos.length > 0 ? (
                      <div className="space-y-2">
                        {stagePhotos.map(p => (
                          <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-800">
                            <img src={p.url} alt={stageName} className="w-full h-24 object-cover" />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] text-slate-200 border border-slate-800">{p.time}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-[10px] text-slate-600 border border-dashed border-slate-800 rounded-xl">
                        Žádné foto
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice Notes with Speech-to-Text */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Mic className="w-3.5 h-3.5 text-rose-400" /> Hlasové poznámky technika (Speech-to-Text)
              </h5>
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-rose-400" />
                <span>{isRecording ? 'Poslouchám a přepisuji...' : 'Nahrát hlasovou poznámku'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {transcribedNotes.map((note, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">#{idx+1}</span>
                  <p className="flex-1">{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Material Receipt Scanner (Feature 7) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-amber-400" /> AI Skener nákupních účtenek (Receipt Scanner)
              </h5>
              <button
                onClick={handleScanReceipt}
                disabled={isScanningReceipt}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isScanningReceipt ? 'Skenuji účtenku OCR...' : 'Vyfotit účtenku'}</span>
              </button>
            </div>

            {scannedReceipt && (
              <div className="bg-slate-950 border border-amber-500/40 p-4 rounded-2xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-amber-400 border-b border-slate-800 pb-2">
                  <span>Extrahovaná data z účtenky</span>
                  <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Zaúčtováno k projektu</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div><strong className="text-slate-100">Dodavatel (Supplier):</strong> {scannedReceipt.supplier}</div>
                  <div><strong className="text-slate-100">Částka (Amount):</strong> {scannedReceipt.price.toLocaleString()} Kč</div>
                  <div><strong className="text-slate-100">Sazba DPH (VAT):</strong> {scannedReceipt.vat}%</div>
                  <div><strong className="text-slate-100">Materiál:</strong> {scannedReceipt.item}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


