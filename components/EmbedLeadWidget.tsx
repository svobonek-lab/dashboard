import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Upload, 
  MapPin, 
  Calendar, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Mic, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  Navigation, 
  FileText, 
  Volume2,
  ShieldCheck,
  Zap,
  Building2
} from 'lucide-react';
import { CompanyBranding } from '../types';

export interface EmbedLeadWidgetProps {
  branding: CompanyBranding;
  isOpen: boolean;
  onClose: () => void;
  onSubmitLead: (leadData: any) => void;
  customColor?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export const EmbedLeadWidget: React.FC<EmbedLeadWidgetProps> = ({
  branding,
  isOpen,
  onClose,
  onSubmitLead,
  customColor,
}) => {
  const activeColor = customColor || branding.primaryColor || '#2563eb';
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    projectType: 'Pergola',
    address: `Zahradní 42, ${branding.city || 'Praha'}`,
    budgetValue: 250000,
    preferredDate: '2026-05-15',
    description: '',
    photos: [] as string[]
  });

  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [analyzingPhotos, setAnalyzingPhotos] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    detectedType: string;
    complexity: string;
    suggestedTeam: string;
    recommendedNextStep: string;
  } | null>(null);

  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const projectTypes = [
    { id: 'Pergola', title: 'Pergola', desc: 'Designové zastřešení & terasy', icon: '🪵' },
    { id: 'Roof', title: 'Roof (Střecha)', desc: 'Krovy, krytiny a rekonstrukce', icon: '🏠' },
    { id: 'Reconstruction', title: 'Reconstruction', desc: 'Kompletní rekonstrukce', icon: '🔨' },
    { id: 'Wooden House', title: 'Wooden House', desc: 'Dřevostavby na klíč', icon: '🌲' },
    { id: 'Facade', title: 'Facade & Insulation', desc: 'Zateplení a fasády', icon: '🧱' },
    { id: 'Interior', title: 'Interior Fitout', desc: 'Sádrokartony a podlahy', icon: '🛋️' },
    { id: 'Other', title: 'Other Works', desc: 'Zemní práce a ploty', icon: '⚡' }
  ];

  const validateStep1 = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.fullName.trim()) errors.fullName = 'Vyplňte prosím celé jméno';
    if (!formData.phone.trim() || formData.phone.length < 9) errors.phone = 'Zadejte platné telefonní číslo';
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = 'Zadejte platný e-mail';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep(prev => prev + 1);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setAnalyzingPhotos(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        photos: [
          ...prev.photos,
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
          'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800'
        ]
      }));
      setAnalyzingPhotos(false);
      setAiAnalysisResult({
        detectedType: formData.projectType,
        complexity: 'Střední složitost (předpoklad 4-5 dní realizace)',
        suggestedTeam: 'Petr Novotný (Mistr tesař) + 2 montéři',
        recommendedNextStep: 'Zpracování položkového rozpočtu a rezervace materiálu v centrálním skladu.'
      });
    }, 1400);
  };

  const handleVoiceInputToggle = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      setTimeout(() => {
        setIsRecordingVoice(false);
        const transcript = "Poptávám zhotovení moderní pergoly 6x4m s hliníkovými lamelami, LED osvětlením a kotvením do zateplené fasády.";
        setFormData(prev => ({
          ...prev,
          description: prev.description ? `${prev.description} ${transcript}` : transcript
        }));
      }, 2500);
    } else {
      setIsRecordingVoice(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmitLead({
      ...formData,
      budget: `${(formData.budgetValue / 1000).toFixed(0)}k CZK`,
      price: formData.budgetValue,
      aiAnalysis: aiAnalysisResult
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden relative transform transition-all duration-300"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Header with Company Branding */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
              style={{ backgroundColor: activeColor }}
            >
              {branding.name ? branding.name.substring(0, 2).toUpperCase() : 'DF'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{branding.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600">AI Inquiry Active</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 leading-none mt-0.5">Rychlá nezávazná poptávka</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Krok {step}/7</span>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div 
            className="h-full transition-all duration-300 rounded-r-full"
            style={{ 
              width: submitted ? '100%' : `${(step / 7) * 100}%`, 
              backgroundColor: activeColor 
            }}
          />
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {submitted ? (
            /* Celebration & Success Screen */
            <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100 animate-bounce-subtle">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">Poptávka byla úspěšně přijata!</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Děkujeme, <span className="font-bold text-slate-800">{formData.fullName}</span>. Vaše poptávka pro <span className="font-bold text-slate-800">{branding.name}</span> byla okamžitě analyzována AI systémem a zařazena do CRM.
                </p>
              </div>

              {/* Automated Triggers Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3 text-xs max-w-md mx-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Automatické notifikace</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">Dokončeno</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">SMS potvrzení klientovi:</span>
                  <span className="font-bold text-emerald-600">✓ Odesláno na {formData.phone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">E-mail s rekapitulací:</span>
                  <span className="font-bold text-emerald-600">✓ Odesláno na {formData.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Přiřazený specialista:</span>
                  <span className="font-bold text-slate-900">Petr Novotný (Mistr tesař)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">AI Lead Score:</span>
                  <span className="font-bold text-purple-600">87/100 (Vysoká priorita)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setStep(1);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95"
                  style={{ backgroundColor: activeColor }}
                >
                  Zavřít okno
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Contact Information */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">1. Vaše kontaktní údaje</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Kam vám máme zaslat orientační rozpočet a termín schůzky?</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Celé jméno / Firma *</label>
                      <div className="relative mt-1">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          placeholder="Ing. Petr Novák"
                          className={`w-full bg-slate-50 border rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                            validationErrors.fullName ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-blue-500'
                          }`}
                        />
                      </div>
                      {validationErrors.fullName && <p className="text-[10px] text-rose-600 font-bold mt-1">{validationErrors.fullName}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Telefonní číslo *</label>
                        <div className="relative mt-1">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+420 777 123 456"
                            className={`w-full bg-slate-50 border rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                              validationErrors.phone ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                        {validationErrors.phone && <p className="text-[10px] text-rose-600 font-bold mt-1">{validationErrors.phone}</p>}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">E-mailová adresa *</label>
                        <div className="relative mt-1">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="petr.novak@example.cz"
                            className={`w-full bg-slate-50 border rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 ${
                              validationErrors.email ? 'border-rose-400 focus:ring-rose-300' : 'border-slate-200 focus:ring-blue-500'
                            }`}
                          />
                        </div>
                        {validationErrors.email && <p className="text-[10px] text-rose-600 font-bold mt-1">{validationErrors.email}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Project Type Cards */}
              {step === 2 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">2. Vyberte typ stavebního projektu</h4>
                    <p className="text-xs text-slate-500 mt-0.5">AI na základě vašeho výběru navrhne vhodný tým a materiály.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {projectTypes.map((type) => {
                      const isSelected = formData.projectType === type.id;
                      return (
                        <div
                          key={type.id}
                          onClick={() => setFormData({ ...formData, projectType: type.id })}
                          className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected 
                              ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="text-2xl mb-1.5">{type.icon}</div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-xs">{type.title}</h5>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{type.desc}</p>
                          </div>
                          {isSelected && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-blue-600">
                              <Check className="w-3 h-3" /> Vybráno
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Address & Live Map Preview */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">3. Místo realizace & Pokrytí</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Zadejte město či adresu pro ověření servisní zóny řemeslníků.</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Adresa / Město</label>
                    <div className="relative mt-1">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder={`Zahradní 42, ${branding.city || 'Praha'}`}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Live Map Preview */}
                  <div className="h-44 bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-800 p-4 flex flex-col justify-between shadow-inner">
                    <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:18px_18px] opacity-50" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-slate-800/90 text-white rounded-lg text-[9px] font-bold border border-slate-700 flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-blue-400" /> Servisní rádius {branding.city || 'Region'} (do 45 km)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Oblast obsloužena
                      </span>
                    </div>

                    <div className="relative z-10 flex items-center justify-center">
                      <div className="p-2.5 bg-white text-slate-900 rounded-xl shadow-xl flex items-center gap-1.5 border border-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
                        <span className="text-xs font-bold">{formData.address || branding.city}</span>
                      </div>
                    </div>

                    <div className="relative z-10 text-[9px] text-slate-400 flex items-center justify-between">
                      <span>Dostupnost výjezdu technika: do 24 hod</span>
                      <span>Doprava v ceně zakázky</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Budget Slider */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">4. Plánovaný rozpočet</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Přizpůsobte rozpočet pro návrh optimálních materiálů.</p>
                  </div>

                  <div className="space-y-4 py-3">
                    <div className="text-center space-y-1">
                      <span className="text-2xl font-black text-slate-900">
                        {formData.budgetValue.toLocaleString()} CZK
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {formData.budgetValue < 100000 ? 'Základní ekonomická specifikace' :
                         formData.budgetValue <= 250000 ? 'Standardní prémiové provedení' : 'Zakázková luxusní specifikace na míru'}
                      </p>
                    </div>

                    <input
                      type="range"
                      min={50000}
                      max={600000}
                      step={10000}
                      value={formData.budgetValue}
                      onChange={(e) => setFormData({ ...formData, budgetValue: Number(e.target.value) })}
                      className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />

                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-slate-600">
                      <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 50000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 text-[11px]">50k</button>
                      <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 100000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 text-[11px]">100k</button>
                      <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 250000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 text-[11px]">250k</button>
                      <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 500000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100 text-[11px]">500k+</button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Preferred Date */}
              {step === 5 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">5. Preferovaný termín realizace</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Kdy byste si přáli zahájit zaměření nebo montáž?</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Požadovaný termín</label>
                      <div className="relative mt-1">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="date"
                          value={formData.preferredDate}
                          onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-0.5">
                      <p className="font-bold">Dostupnost montážních kapacit:</p>
                      <p>V termínu {new Date(formData.preferredDate).toLocaleDateString('cs')} má montážní tým v {branding.city || 'regionu'} 2 volné kapacity.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Photos & PDF Upload with Live AI Analysis */}
              {step === 6 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">6. Fotografie místa & PDF nákresy (AI Analýza)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Nahrajte fotky (JPG, PNG, HEIC, PDF). AI okamžitě odhadne složitost stavby.</p>
                  </div>

                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-blue-400 transition-colors bg-slate-50/60">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="embed-widget-file-upload"
                    />
                    <label htmlFor="embed-widget-file-upload" className="cursor-pointer space-y-1.5 block">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">Přetáhněte fotografie nebo nákres sem</p>
                      <p className="text-[10px] text-slate-400">Podporuje JPG, PNG, HEIC, PDF (max 25MB)</p>
                    </label>
                  </div>

                  {analyzingPhotos && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center gap-2.5 animate-pulse text-xs">
                      <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                      <span className="font-bold text-blue-900">AI analyzuje fotografii a terénní prvky...</span>
                    </div>
                  )}

                  {aiAnalysisResult && (
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">AI Analýza stavby</span>
                        </div>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                          Orientační odhad
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-800/80 p-2.5 rounded-xl">
                          <span className="text-slate-400 text-[9px] block">Složitost</span>
                          <span className="font-bold text-emerald-400">{aiAnalysisResult.complexity}</span>
                        </div>
                        <div className="bg-slate-800/80 p-2.5 rounded-xl">
                          <span className="text-slate-400 text-[9px] block">Doporučený tým</span>
                          <span className="font-bold text-white truncate block">{aiAnalysisResult.suggestedTeam}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 7: Project Description & Voice Input */}
              {step === 7 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">7. Popis požadavků & Hlasový vstup</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Napište detaily nebo nadiktujte požadavky hlasem.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleVoiceInputToggle}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isRecordingVoice ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{isRecordingVoice ? 'Poslouchám...' : 'Hlasové zadání'}</span>
                    </button>
                  </div>

                  {isRecordingVoice && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <Volume2 className="w-4 h-4 text-rose-600 animate-ping" />
                        <span>Mluvte přirozeně česky...</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[30, 60, 90, 50, 25, 75, 40].map((h, i) => (
                          <div key={i} className="w-1 bg-rose-500 rounded-full animate-pulse" style={{ height: `${h / 2.5}px` }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Popište podrobnosti (např. rozměry 6x4m, orientace k jihu, zapuštění do zateplení fasády)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation */}
        {!submitted && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev - 1)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Zpět
              </button>
            ) : <div />}

            {step < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 hover:opacity-95"
                style={{ backgroundColor: activeColor }}
              >
                <span>Další krok ({step + 1}/7)</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-lg flex items-center gap-1.5 hover:opacity-95"
                style={{ backgroundColor: activeColor }}
              >
                <Sparkles className="w-4 h-4" /> Odeslat poptávku
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
