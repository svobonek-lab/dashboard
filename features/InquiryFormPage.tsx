import React, { useState } from 'react';
import { 
  Sparkles, 
  Upload, 
  MapPin, 
  Calendar, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Mic, 
  ShieldCheck, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2,
  Navigation,
  FileText,
  AlertCircle,
  Volume2
} from 'lucide-react';
import { CompanyBranding } from '../types';

interface InquiryFormPageProps {
  branding: CompanyBranding;
  onSubmitInquiry: (leadData: any) => void;
  onBackToDashboard: () => void;
}

export const InquiryFormPage: React.FC<InquiryFormPageProps> = ({
  branding,
  onSubmitInquiry,
  onBackToDashboard
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    projectType: 'Pergola',
    address: `Zahradní 42, ${branding.city}`,
    budgetValue: 250000,
    preferredDate: '2026-05-15',
    description: '',
    photos: [] as string[]
  });

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [analyzingPhotos, setAnalyzingPhotos] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    detectedType: string;
    complexity: string;
    suggestedTeam: string;
    recommendedNextStep: string;
  } | null>(null);

  const [submitted, setSubmitted] = useState(false);

  const projectTypes = [
    { id: 'Pergola', title: 'Pergola', desc: 'Designové venkovní zastřešení a terasy', icon: '🪵' },
    { id: 'Roof', title: 'Roof (Střecha)', desc: 'Kompletní střechy, krovy a krytina', icon: '🏠' },
    { id: 'Reconstruction', title: 'Reconstruction', desc: 'Kompletní rekonstrukce domů a bytů', icon: '🔨' },
    { id: 'Wooden House', title: 'Wooden House', desc: 'Moderní nízkoenergetické dřevostavby', icon: '🌲' },
    { id: 'Facade', title: 'Facade & Insulation', desc: 'Zateplení fasád a finální omítky', icon: '🧱' },
    { id: 'Interior', title: 'Interior Fitout', desc: 'Podlahy, stropy, obklady a sádrokartony', icon: '🛋️' },
    { id: 'Other', title: 'Other Works', desc: 'Zemní práce, ploty, opěrné zdi', icon: '⚡' }
  ];

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
        complexity: 'Střední složitost (Odhad 4-6 dní realizace)',
        suggestedTeam: 'Petr Novotný (Mistr tesař) + 2 montéři',
        recommendedNextStep: 'Zpracování položkového rozpočtu a rezervace materiálu v centrálním skladu.'
      });
    }, 1500);
  };

  const handleVoiceInputToggle = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      setTimeout(() => {
        setIsRecordingVoice(false);
        const transcript = "Poptávám zhotovení moderní dřevěné pergoly 6x4m s hliníkovými lamelami, přípravou na LED osvětlení a kotvením do zateplené fasády.";
        setFormData(prev => ({
          ...prev,
          description: prev.description ? `${prev.description} ${transcript}` : transcript
        }));
      }, 3000);
    } else {
      setIsRecordingVoice(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmitInquiry({
      ...formData,
      budget: `${(formData.budgetValue / 1000).toFixed(0)}k CZK`,
      price: formData.budgetValue,
      aiAnalysis: aiAnalysisResult
    });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-6 bg-white rounded-3xl border border-slate-200 shadow-xl my-12 animate-in fade-in">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Poptávka byla úspěšně odeslána a zařazena!</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Děkujeme, <span className="font-bold text-slate-900">{formData.fullName}</span>. Vaše poptávka pro <span className="font-bold text-slate-900">{branding.name}</span> byla okamžitě ohodnocena AI systémem a zařazena do CRM.
          </p>
        </div>

        {/* Automated System Triggers Card */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-3.5 max-w-lg mx-auto text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Automatické spouštěče:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Systém aktivní</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">1. Customer SMS potvrzení:</span>
            <span className="font-semibold text-emerald-600">✓ Odesláno na {formData.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">2. Customer E-mail potvrzení:</span>
            <span className="font-semibold text-emerald-600">✓ Odesláno na {formData.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">3. Vytvořen CRM Lead & Project Draft:</span>
            <span className="font-semibold text-blue-600">✓ Projekt "{formData.projectType} - {formData.fullName}"</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">4. AI Lead Scoring & Technik:</span>
            <span className="font-semibold text-purple-600">✓ 87/100 (Petr Novotný přiřazen)</span>
          </div>
        </div>

        <div className="pt-4 flex justify-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Přejít do Executive Dashboardu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Production AI Inquiry Engine</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{branding.name} — Poptávkový formulář</h2>
          <p className="text-xs text-slate-500 mt-0.5">Vyplňte 7 kroků poptávky pro okamžitý AI odhad a zařazení do CRM.</p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Zpět do CRM
        </button>
      </div>

      {/* Progress Bar & Steps Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>Krok {step} ze 7: {
            step === 1 ? 'Kontaktní údaje' :
            step === 2 ? 'Typ projektu' :
            step === 3 ? 'Adresa a mapa' :
            step === 4 ? 'Rozpočet' :
            step === 5 ? 'Termín' :
            step === 6 ? 'Fotografie a AI Analýza' : 'Popis a Hlasový vstup'
          }</span>
          <span>{Math.round((step / 7) * 100)}% dokončeno</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 7) * 100}%`, backgroundColor: branding.primaryColor }}
          />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6">
        
        {/* STEP 1: Customer Information */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Krok 1: Informace o zákazníkovi</h3>
              <p className="text-xs text-slate-500 mt-1">Zadejte své kontaktní údaje s živou validací.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Celé jméno / Obchodní firma *</label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ing. Jan Svoboda"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Telefonní číslo *</label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+420 603 456 789"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">E-mailová adresa *</label>
                  <div className="relative mt-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jan.svoboda@example.cz"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Project Type Cards */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Krok 2: Typ stavebního projektu</h3>
              <p className="text-xs text-slate-500 mt-1">Vyberte kategorii stavby. AI předpřipraví materiálový list.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {projectTypes.map((type) => {
                const isSelected = formData.projectType === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setFormData({ ...formData, projectType: type.id })}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50/40 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-3xl mb-3">{type.icon}</div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{type.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{type.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">
                        <Check className="w-3.5 h-3.5" /> Vybráno
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
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Krok 3: Adresa realizace & Geografický náhled</h3>
              <p className="text-xs text-slate-500 mt-1">Automatické doplnění adresy a ověření servisní zóny technika.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Místo stavby (Adresa s našeptávačem)</label>
                <div className="relative mt-1">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={`Zahradní 42, ${branding.city}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Live Map Preview Container */}
              <div className="h-56 bg-slate-900 rounded-2xl relative overflow-hidden border border-slate-800 p-4 flex flex-col justify-between shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-50" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-slate-800/90 text-white rounded-lg text-[10px] font-bold border border-slate-700 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-blue-400" /> Servisní oblast: {branding.city} a okolí (do 45 km)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Oblast pokryta
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-center">
                  <div className="p-3 bg-white text-slate-900 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-200 animate-bounce-subtle">
                    <MapPin className="w-4 h-4 text-rose-600 fill-rose-500" />
                    <span className="text-xs font-bold">{formData.address || branding.city}</span>
                  </div>
                </div>

                <div className="relative z-10 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>GPS: 49.1951° N, 16.6068° E</span>
                  <span>Dostupnost technika: do 24 hodin</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Budget Slider */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Krok 4: Plánovaný rozpočet</h3>
              <p className="text-xs text-slate-500 mt-1">Nastavte posuvníkem předpokládanou investici pro optimální materiálovou skladbu.</p>
            </div>

            <div className="space-y-6 py-4">
              <div className="text-center space-y-1">
                <span className="text-3xl font-black text-slate-900">
                  {formData.budgetValue.toLocaleString()} CZK
                </span>
                <p className="text-xs text-slate-500">
                  {formData.budgetValue < 100000 ? 'Základní ekonomická varianta' :
                   formData.budgetValue <= 250000 ? 'Standardní prémiové provedení' : 'Zakázková luxusní specifikace na klíč'}
                </p>
              </div>

              <input
                type="range"
                min={50000}
                max={600000}
                step={10000}
                value={formData.budgetValue}
                onChange={(e) => setFormData({ ...formData, budgetValue: Number(e.target.value) })}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-slate-600">
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 50000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100">50k</button>
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 100000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100">100k</button>
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 250000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100">250k</button>
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 500000 })} className="p-2 bg-slate-50 rounded-xl hover:bg-slate-100">500k+</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Preferred Date */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Krok 5: Preferovaný termín realizace</h3>
              <p className="text-xs text-slate-500 mt-1">Kdy byste si přáli zahájit montáž nebo zaměření?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Datum zahájení</label>
                <div className="relative mt-1">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                <p className="font-bold">Informace o kapacitě:</p>
                <p>Termín v měsíci {new Date(formData.preferredDate).toLocaleString('cs', { month: 'long' })} má v {branding.city} aktuálně 3 volné montážní sloty.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Photo Upload & Instant AI Analysis */}
        {step === 6 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Krok 6: Fotografie místa & Okamžitá AI Analýza</h3>
              <p className="text-xs text-slate-500 mt-1">Nahrajte fotografie nebo projektový nákres (JPG, PNG, HEIC, PDF). AI okamžitě odhadne složitost.</p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/60">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="inquiry-file-upload-v2"
                />
                <label htmlFor="inquiry-file-upload-v2" className="cursor-pointer space-y-2 block">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Přetáhněte fotografie sem nebo klikněte pro výběr</p>
                  <p className="text-[11px] text-slate-400">Podpora formátů: JPG, PNG, HEIC, PDF (max 25MB)</p>
                </label>
              </div>

              {analyzingPhotos && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-xs font-bold text-blue-900">AI analyzuje stavební prvky a terén...</span>
                </div>
              )}

              {aiAnalysisResult && (
                <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-6 rounded-2xl border border-blue-500/40 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">AI Analýza Poptávky</span>
                    </div>
                    <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Informativní odhad (ne závazná nabídka)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Detekovaný typ</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{aiAnalysisResult.detectedType}</span>
                    </div>
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Odhadovaná složitost</span>
                      <span className="font-bold text-emerald-400 text-sm mt-0.5 block">{aiAnalysisResult.complexity}</span>
                    </div>
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Doporučený tým</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{aiAnalysisResult.suggestedTeam}</span>
                    </div>
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Doporučený další krok</span>
                      <span className="font-bold text-blue-300 text-xs mt-0.5 block">{aiAnalysisResult.recommendedNextStep}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 7: Project Description & Voice Input */}
        {step === 7 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Krok 7: Detailní popis projektu & Hlasové zadání</h3>
                <p className="text-xs text-slate-500 mt-1">Můžete napsat detailní požadavky nebo nadiktovat hlasem.</p>
              </div>

              <button
                type="button"
                onClick={handleVoiceInputToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                  isRecordingVoice ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isRecordingVoice ? 'Nahrávám hlas...' : 'Hlasové zadání'}</span>
              </button>
            </div>

            {isRecordingVoice && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between animate-in fade-in text-xs text-rose-900">
                <div className="flex items-center gap-2 font-semibold">
                  <Volume2 className="w-4 h-4 text-rose-600 animate-ping" />
                  <span>Poslouchám váš hlas... Mluvte přirozeně česky.</span>
                </div>
                <div className="flex items-center gap-1">
                  {[40, 70, 95, 60, 30, 80, 50].map((h, i) => (
                    <div key={i} className="w-1 bg-rose-500 rounded-full animate-pulse" style={{ height: `${h / 2}px` }} />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <textarea
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Popište vaše požadavky, materiály, rozměry (např. 'Hledáme realizaci dřevěné pergoly 6x4m s polykarbonátovým zastřešením a přípravou pro LED pásky')..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Zpět
            </button>
          ) : <div />}

          {step < 7 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 hover:opacity-95"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <span>Pokračovat na Krok {step + 1}</span> <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-8 py-3.5 rounded-xl text-xs font-extrabold text-white shadow-lg flex items-center gap-2 hover:opacity-95"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <Sparkles className="w-4 h-4" /> Odeslat AI Poptávku (Vytvořit Lead)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
