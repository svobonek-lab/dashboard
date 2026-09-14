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
  RefreshCw,
  Briefcase,
  ListCheck,
  Image as ImageIcon,
  FileSpreadsheet
} from 'lucide-react';
import { Lead, CompanyBranding } from '../types';

interface EmployeeDashboardProps {
  leads: Lead[];
  branding: CompanyBranding;
  onOpenVoiceNotes: () => void;
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  leads,
  branding,
  onOpenVoiceNotes,
  onSelectLead,
  onUpdateLead
}) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'siteVisit' | 'photos' | 'tools'>('jobs');
  const [activeJobStatus, setActiveJobStatus] = useState<'Driving' | 'Arrived' | 'Finished'>('Arrived');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(3);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fullscreen Site Visit Mode
  const [isSiteVisitMode, setIsSiteVisitMode] = useState(false);

  // 5-point Checklist State
  const [checklist, setChecklist] = useState({
    measurements: true,
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

  const activeLead = leads[0] || leads[1];

  // Before / During / After Timeline State
  const [timelinePhotos, setTimelinePhotos] = useState<{ id: string; stage: 'Before' | 'During' | 'After'; url: string; time: string }[]>([
    { id: '1', stage: 'Before', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f2445?auto=format&fit=crop&w=400&q=80', time: '08:15 AM' },
    { id: '2', stage: 'During', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80', time: '11:30 AM' }
  ]);

  // Sync timelinePhotos with activeLead.photos
  React.useEffect(() => {
    if (activeLead && activeLead.photos && activeLead.photos.length > 0) {
      const formatted = activeLead.photos.map(p => ({
        id: p.id,
        stage: (p.category || 'During') as 'Before' | 'During' | 'After',
        url: p.url,
        time: p.uploadedAt || '10:00 AM'
      }));
      setTimelinePhotos(formatted);
    }
  }, [activeLead?.id, activeLead?.photos]);

  const [uploadStage, setUploadStage] = useState<'Before' | 'During' | 'After' | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerFileInput = (stage: 'Before' | 'During' | 'After') => {
    setUploadStage(stage);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && activeLead && uploadStage) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result && onUpdateLead) {
          const base64Url = evt.target.result as string;
          const newPhoto = {
            id: 'photo-' + Date.now(),
            name: file.name.split('.')[0] || 'Fotka ze stavby',
            type: 'photo' as const,
            url: base64Url,
            uploadedAt: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
            category: uploadStage
          };
          
          const currentPhotos = activeLead.photos || [];
          const updatedLead = {
            ...activeLead,
            photos: [newPhoto, ...currentPhotos]
          };
          onUpdateLead(updatedLead);
          setChecklist(prev => ({ ...prev, photos: true }));
          if (isOfflineMode) {
            setOfflineQueueCount(prev => prev + 1);
          }
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhoto = (stage: 'Before' | 'During' | 'After') => {
    triggerFileInput(stage);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const text = "Zkontrolováno kotvení střešní konstrukce, vše v pořádku podle výkresu.";
      setTranscribedNotes([text, ...transcribedNotes]);
      setChecklist(prev => ({ ...prev, voiceNotes: true }));
    }, 2000);
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
    }, 1800);
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
      if (activeLead) onSelectLead(activeLead);
    }, 2500);
  };

  const completedChecklistCount = Object.values(checklist).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 text-slate-900">
      {/* Fullscreen Site Visit Mode Modal */}
      {isSiteVisitMode && (
        <div className="fixed inset-0 z-50 bg-slate-50 text-slate-900 flex flex-col overflow-y-auto animate-in fade-in">
          {/* Top Bar */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-primary-soft text-brand-primary border border-brand-primary-soft flex items-center justify-center font-bold">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Režim zaměření na stavbě</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                    Live GPS Aktivní
                  </span>
                </h3>
                <p className="text-xs text-slate-500">{activeLead?.title} • {activeLead?.customerName}</p>
              </div>
            </div>

            <button
              onClick={() => setIsSiteVisitMode(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/80"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Ukončit</span>
            </button>
          </div>

          <div className="p-6 max-w-2xl mx-auto w-full space-y-6 flex-1">
            {/* GPS Confirmation Banner */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">GPS Potvrzení Polohy</h4>
                  <p className="text-xs text-emerald-800 font-bold">{activeLead?.address}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Přesnost GPS: 4 metry • Zaznamenáno v 08:14</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-extrabold uppercase">
                Ověřeno
              </span>
            </div>

            {/* Checklist Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div>
                <h4 className="text-base font-bold text-slate-900">Interaktivní Checklist technika</h4>
                <p className="text-xs text-slate-500">Splňte 5 kroků zaměření před vygenerováním nabídky</p>
              </div>
              <span className="text-xs font-bold text-brand-primary bg-brand-primary-soft px-3 py-1.5 rounded-full border border-brand-primary-soft">
                {completedChecklistCount} / 5 splněno
              </span>
            </div>

            {/* Checklist Items */}
            <div className="space-y-4">
              {/* 1. Measurements */}
              <div className={`p-4 rounded-2xl border transition-all ${
                checklist.measurements ? 'bg-white border-emerald-300 shadow-xs' : 'bg-white border-slate-200/80'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Ruler className="w-5 h-5 text-brand-primary" />
                    <span className="text-sm font-bold text-slate-900">1. Zaměření rozměrů (Measurements)</span>
                  </div>
                  <button
                    onClick={() => setChecklist(prev => ({ ...prev, measurements: !prev.measurements }))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                      checklist.measurements ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {checklist.measurements ? 'Hotovo' : 'Označit splněno'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Šířka</label>
                    <input
                      type="text"
                      value={measurementsData.width}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, width: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Délka</label>
                    <input
                      type="text"
                      value={measurementsData.length}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, length: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Výška</label>
                    <input
                      type="text"
                      value={measurementsData.height}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, height: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Sklon střechy</label>
                    <input
                      type="text"
                      value={measurementsData.slope}
                      onChange={(e) => setMeasurementsData({ ...measurementsData, slope: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Customer Signature */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PenTool className="w-5 h-5 text-brand-primary" />
                    <span className="text-sm font-bold text-slate-900">2. Podpis zákazníka na displeji</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    signatureDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {signatureDone ? 'Podepsáno' : 'Čeká na podpis'}
                  </span>
                </div>
                
                <div 
                  onClick={() => {
                    setSignatureDone(true);
                    setChecklist(prev => ({ ...prev, customerSignature: true }));
                  }}
                  className="h-28 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-600 cursor-pointer hover:border-brand-primary transition-all relative overflow-hidden"
                >
                  {signatureDone ? (
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <span className="font-serif italic text-2xl text-text font-bold tracking-widest">{activeLead?.customerName}</span>
                      <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-bold">
                        <Check className="w-3.5 h-3.5" /> Digitálně podepsáno v 08:22
                      </span>
                    </div>
                  ) : (
                    <>
                      <PenTool className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Klepněte sem pro podpis zákazníka</span>
                      <span className="text-[10px] text-slate-500">Potvrzení zaměření a schválení parametrů</span>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Material Notes */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-brand-primary" />
                    <span className="text-sm font-bold text-slate-900">3. Materiálové specifikace</span>
                  </div>
                  <button
                    onClick={() => setChecklist(prev => ({ ...prev, materialNotes: !prev.materialNotes }))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border ${
                      checklist.materialNotes ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-700 border-slate-200'
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary-soft"
                />
              </div>
            </div>

            {/* Prominent One-Button: Generate Quote */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <button
                onClick={handleGenerateQuoteFromField}
                className="w-full py-3.5 rounded-2xl bg-brand-primary hover:bg-brand-primary text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
              >
                <Sparkles className="w-5 h-5" />
                <span>Vytvořit cenovou nabídku na klíč</span>
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Přenese rozměry {measurementsData.width} × {measurementsData.length}, fotky i materiál přímo do PDF nabídky.
              </p>
            </div>

            {quoteGeneratedNotice && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{quoteGeneratedNotice}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee Header Profile & Offline Sync Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
              alt="Petr Novotný"
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-brand-primary-soft shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Petr Novotný</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-primary-soft text-brand-primary border border-brand-primary-soft text-[11px] font-bold">
                  Mistr stavby
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Tesařské práce & pergoly • {branding.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isOfflineMode 
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {isOfflineMode ? <WifiOff className="w-4 h-4 text-amber-600" /> : <Wifi className="w-4 h-4 text-emerald-600" />}
              <span>{isOfflineMode ? 'Offline Režim' : 'Online Sync'}</span>
            </button>

            {offlineQueueCount > 0 && (
              <button
                onClick={handleSyncOffline}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-primary hover:bg-brand-primary text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync ({offlineQueueCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Launch Site Visit Button */}
        <button
          onClick={() => setIsSiteVisitMode(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-brand-primary hover:bg-brand-primary text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Otevřít režim zaměření na stavbě (Site Visit Mode)</span>
        </button>
      </div>

      {/* Structured Navigation Tabs */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl gap-1 text-xs font-bold border border-slate-200/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'jobs' 
              ? 'bg-white text-brand-primary shadow-xs border border-slate-200/80' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4 text-brand-primary" />
          <span>Dnešní zakázky ({leads.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('siteVisit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'siteVisit' 
              ? 'bg-white text-brand-primary shadow-xs border border-slate-200/80' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListCheck className="w-4 h-4 text-brand-primary" />
          <span>Checklist & Zaměření ({completedChecklistCount}/5)</span>
        </button>

        <button
          onClick={() => setActiveTab('photos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'photos' 
              ? 'bg-white text-brand-primary shadow-xs border border-slate-200/80' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon className="w-4 h-4 text-brand-primary" />
          <span>Fotodokumentace ({timelinePhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'tools' 
              ? 'bg-white text-brand-primary shadow-xs border border-slate-200/80' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-brand-primary" />
          <span>Hlas & AI Účtenky</span>
        </button>
      </div>

      {/* TAB 1: DNEŠNÍ ZAKÁZKY */}
      {activeTab === 'jobs' && activeLead && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-brand-primary-soft text-brand-primary border border-brand-primary-soft mb-2">
                Aktivní stavba k realizaci
              </span>
              <h3 className="text-lg font-bold text-slate-900">{activeLead.title}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-primary shrink-0" /> {activeLead.address}
              </p>
            </div>
            <img 
              src={activeLead.thumbnail} 
              alt="" 
              className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-xs" 
            />
          </div>

          {/* Contact & Navigation Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href={`tel:${activeLead.customerPhone}`}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-all flex items-center gap-3 text-xs font-semibold text-slate-800"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 font-bold">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-normal">Zavolat zákazníkovi</p>
                <p className="truncate text-sm font-bold text-slate-900">{activeLead.customerName}</p>
              </div>
            </a>

            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(activeLead.address)}`}
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-all flex items-center gap-3 text-xs font-semibold text-slate-800"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-primary-soft text-brand-primary border border-brand-primary-soft flex items-center justify-center shrink-0 font-bold">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-normal">Navigovat na stavbu</p>
                <p className="text-sm font-bold text-slate-900">Spustit Google Maps</p>
              </div>
            </a>
          </div>

          {/* Status Buttons */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stav v terénu</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveJobStatus('Driving')}
                className={`py-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  activeJobStatus === 'Driving'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Na cestě</span>
              </button>
              <button
                onClick={() => setActiveJobStatus('Arrived')}
                className={`py-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  activeJobStatus === 'Arrived'
                    ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Na místě (GPS)</span>
              </button>
              <button
                onClick={() => setActiveJobStatus('Finished')}
                className={`py-3 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  activeJobStatus === 'Finished'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Dokončeno</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHECKLIST & ZAMĚŘENÍ */}
      {activeTab === 'siteVisit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Interaktivní Protokol & Zaměření</h3>
              <p className="text-xs text-slate-500">Zadejte specifikace zakázky pro automatické vytvoření cenové nabídky</p>
            </div>
            <span className="text-xs font-bold text-brand-primary bg-brand-primary-soft px-3 py-1.5 rounded-full border border-brand-primary-soft">
              {completedChecklistCount} / 5 splněno
            </span>
          </div>

          <div className="space-y-4">
            {/* 1. Measurements */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-brand-primary" /> 1. Rozměry díla
                </span>
                <button
                  onClick={() => setChecklist(prev => ({ ...prev, measurements: !prev.measurements }))}
                  className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border ${
                    checklist.measurements ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {checklist.measurements ? 'Hotovo' : 'Potvrdit'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Šířka</label>
                  <input
                    type="text"
                    value={measurementsData.width}
                    onChange={(e) => setMeasurementsData({ ...measurementsData, width: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Délka</label>
                  <input
                    type="text"
                    value={measurementsData.length}
                    onChange={(e) => setMeasurementsData({ ...measurementsData, length: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Výška</label>
                  <input
                    type="text"
                    value={measurementsData.height}
                    onChange={(e) => setMeasurementsData({ ...measurementsData, height: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">Sklon</label>
                  <input
                    type="text"
                    value={measurementsData.slope}
                    onChange={(e) => setMeasurementsData({ ...measurementsData, slope: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 2. Customer Signature */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-brand-primary" /> 2. Podpis klienta
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  signatureDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {signatureDone ? 'Podepsáno' : 'Čeká'}
                </span>
              </div>
              <div 
                onClick={() => {
                  setSignatureDone(true);
                  setChecklist(prev => ({ ...prev, customerSignature: true }));
                }}
                className="h-24 rounded-xl bg-white border border-dashed border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700 cursor-pointer hover:border-brand-primary"
              >
                {signatureDone ? (
                  <span className="font-serif italic text-xl text-text">{activeLead?.customerName} ✓</span>
                ) : (
                  <span>Klepněte pro dotykový podpis zákazníka</span>
                )}
              </div>
            </div>

            <button
              onClick={handleGenerateQuoteFromField}
              className="w-full py-3.5 rounded-2xl bg-brand-primary hover:bg-brand-primary text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Vygenerovat cenovou nabídku z terénu</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FOTODOKUMENTACE */}
      {activeTab === 'photos' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-6 shadow-xs">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Fotodokumentace (Před / Během / Po)</h3>
            <div className="flex gap-1.5">
              <button onClick={() => handleAddPhoto('Before')} className="px-2.5 py-1 bg-brand-primary-soft text-brand-primary border border-brand-primary-soft rounded-lg text-xs font-bold cursor-pointer hover:bg-brand-primary-soft">+ Před</button>
              <button onClick={() => handleAddPhoto('During')} className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-100">+ Během</button>
              <button onClick={() => handleAddPhoto('After')} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-100">+ Po</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Before', 'During', 'After'].map((stageName) => {
              const stagePhotos = timelinePhotos.filter(p => p.stage === stageName);
              return (
                <div key={stageName} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded block text-center border ${
                    stageName === 'Before' ? 'bg-brand-primary-soft border-brand-primary-soft text-brand-primary' :
                    stageName === 'During' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    {stageName === 'Before' ? 'Před montáží' : stageName === 'During' ? 'V průběhu' : 'Hotové dílo'}
                  </span>
                  {stagePhotos.length > 0 ? (
                    <div className="space-y-2">
                      {stagePhotos.map(p => (
                        <div key={p.id} className="relative rounded-xl overflow-hidden border border-slate-200">
                          <img src={p.url} alt={stageName} className="w-full h-32 object-cover" />
                          <span className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-mono">{p.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Žádné foto
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: HLAS & AI ÚČTENKY */}
      {activeTab === 'tools' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voice Notes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Mic className="w-5 h-5 text-brand-primary" />
                <span>Hlasové poznámky</span>
              </h3>
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isRecording ? 'bg-rose-600 text-white border-rose-600 animate-pulse' : 'bg-brand-primary-soft text-brand-primary border-brand-primary-soft hover:bg-brand-primary-soft'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRecording ? 'Nahrávám...' : 'Nahrát'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {transcribedNotes.map((note, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800">
                  <p className="font-bold text-brand-primary mb-0.5">Poznámka #{idx+1}</p>
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Receipt OCR Scanner */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-primary" />
                <span>AI Účtenky (OCR)</span>
              </h3>
              <button
                onClick={handleScanReceipt}
                disabled={isScanningReceipt}
                className="px-3 py-1.5 rounded-xl bg-brand-primary hover:bg-brand-primary text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer border border-brand-primary"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isScanningReceipt ? 'Skenuji...' : 'Vyfotit účtenku'}</span>
              </button>
            </div>

            {scannedReceipt ? (
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>Extrahovaná účtenka</span>
                  <span className="text-emerald-700 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Zaúčtováno</span>
                </div>
                <div className="space-y-1 text-slate-800">
                  <p><strong>Dodavatel:</strong> {scannedReceipt.supplier}</p>
                  <p><strong>Částka:</strong> {scannedReceipt.price.toLocaleString()} Kč (DPH {scannedReceipt.vat}%)</p>
                  <p><strong>Materiál:</strong> {scannedReceipt.item}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                Vyfoťte účtenku za zakoupený materiál z terénu.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
