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
  Check
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
  
  // Voice Notes State
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedNotes, setTranscribedNotes] = useState<string[]>([
    "Zákazník požaduje dodatečné 2 LED světla na jižní fasádu. Materiál připraven v autě.",
    "Dokončeno usazení hlavních nosných trámů, beton schchnul rychle."
  ]);
  const [newVoiceNote, setNewVoiceNote] = useState('');

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

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
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
              <span className="text-[10px] text-amber-300 font-semibold bg-amber-950 px-2 py-0.5 rounded-md border border-amber-800">
                ⏳ {offlineQueueCount} items queued for sync
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Today's Jobs Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Today's Assigned Jobs (2)</h3>
        <span className="text-xs font-semibold text-slate-500">September 10, 2026</span>
      </div>

      {/* Large Active Job Card */}
      {activeLead && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 mb-2">
                Active Job #1
              </span>
              <h4 className="text-xl font-extrabold text-slate-900">{activeLead.title}</h4>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {activeLead.address}
              </p>
            </div>
            <img src={activeLead.thumbnail} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 shadow-sm" />
          </div>

          {/* Contact & Navigation Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href={`tel:${activeLead.customerPhone}`}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-3 text-xs font-semibold text-slate-800"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-normal">Zavolat zákazníkovi</p>
                <p className="truncate text-sm">{activeLead.customerName}</p>
              </div>
            </a>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(activeLead.address)}`}
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-3 text-xs font-semibold text-slate-800"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-normal">Navigovat</p>
                <p className="text-sm">Google Maps</p>
              </div>
            </a>
          </div>

          {/* Status Buttons */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Field Status</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveJobStatus('Driving')}
                className={`py-4 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeJobStatus === 'Driving'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Car className="w-5 h-5" />
                <span>Driving</span>
              </button>
              <button
                onClick={() => setActiveJobStatus('Arrived')}
                className={`py-4 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeJobStatus === 'Arrived'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MapPin className="w-5 h-5" />
                <span>Arrived</span>
              </button>
              <button
                onClick={() => setActiveJobStatus('Finished')}
                className={`py-4 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
                  activeJobStatus === 'Finished'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>Finished</span>
              </button>
            </div>
          </div>

          {/* Before During After Chronological Photo Timeline */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Before / During / After Timeline</h5>
              <div className="flex gap-1">
                <button onClick={() => handleAddPhoto('Before')} className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold">+ Before</button>
                <button onClick={() => handleAddPhoto('During')} className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold">+ During</button>
                <button onClick={() => handleAddPhoto('After')} className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold">+ After</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {['Before', 'During', 'After'].map((stageName) => {
                const stagePhotos = timelinePhotos.filter(p => p.stage === stageName);
                return (
                  <div key={stageName} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded block text-center ${
                      stageName === 'Before' ? 'bg-blue-100 text-blue-700' :
                      stageName === 'During' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {stageName}
                    </span>
                    {stagePhotos.length > 0 ? (
                      <div className="space-y-2">
                        {stagePhotos.map(p => (
                          <div key={p.id} className="relative group">
                            <img src={p.url} alt={stageName} className="w-full h-24 object-cover rounded-xl shadow-xs" />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white">{p.time}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        No photos
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice Notes with Speech-to-Text */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <Mic className="w-3.5 h-3.5 text-rose-600" /> Voice Notes (Speech-to-Text)
              </h5>
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 ${
                  isRecording ? 'bg-rose-600 animate-pulse' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRecording ? 'Listening & Transcribing...' : 'Record Voice Note'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto">
              {transcribedNotes.map((note, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">#{idx+1}</span>
                  <p className="flex-1">{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Material Receipt Scanner */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5 text-blue-600" /> Material Receipt AI Scanner
              </h5>
              <button
                onClick={handleScanReceipt}
                disabled={isScanningReceipt}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isScanningReceipt ? 'Scanning Receipt...' : 'Take Photo of Receipt'}</span>
              </button>
            </div>

            {scannedReceipt && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between font-bold text-blue-900 border-b border-blue-200 pb-2">
                  <span>Extracted Receipt Data</span>
                  <span className="text-emerald-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Auto-Logged to Project</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-blue-950">
                  <div><strong>Supplier:</strong> {scannedReceipt.supplier}</div>
                  <div><strong>Total Price:</strong> {scannedReceipt.price.toLocaleString()} CZK</div>
                  <div><strong>VAT Rate:</strong> {scannedReceipt.vat}%</div>
                  <div><strong>Item:</strong> {scannedReceipt.item}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

