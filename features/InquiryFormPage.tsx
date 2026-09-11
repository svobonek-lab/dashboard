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
    { id: 'Pergola', title: 'Pergola & Přístřešek', desc: 'Designové venkovní zastřešení, pergoly a terasy', icon: '🪵' },
    { id: 'Roof', title: 'Střecha & Krovy', desc: 'Kompletní střechy, krovy, klempířské práce a krytina', icon: '🏠' },
    { id: 'Reconstruction', title: 'Rekonstrukce', desc: 'Kompletní rekonstrukce rodinných domů a bytů', icon: '🔨' },
    { id: 'Wooden House', title: 'Dřevostavba', desc: 'Moderní nízkoenergetické dřevostavby na klíč', icon: '🌲' },
    { id: 'Facade', title: 'Fasáda & Zateplení', desc: 'Zateplení obvodových plášťů, fasády a omítky', icon: '🧱' },
    { id: 'Interior', title: 'Interiér & Sádrokartony', desc: 'Podlahy, stropy, obklady a sádrokartonové konstrukce', icon: '🛋️' },
    { id: 'Other', title: 'Ostatní stavební práce', desc: 'Zemní práce, betonové ploty, opěrné zdi', icon: '⚡' }
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
      budget: `${(formData.budgetValue / 1000).toFixed(0)}k Kč`,
      price: formData.budgetValue,
      aiAnalysis: aiAnalysisResult
    });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl my-12 animate-in fade-in text-slate-100">
        <div className="w-20 h-20 bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">Poptávka byla úspěšně odeslána a zařazena!</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Děkujeme, <span className="font-bold text-slate-200">{formData.fullName}</span>. Vaše poptávka pro firmu <span className="font-bold text-amber-400">{branding.name}</span> byla okamžitě ohodnocena AI systémem a zařazena do CRM.
          </p>
        </div>

        {/* Automated System Triggers Card */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left space-y-3.5 max-w-lg mx-auto text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Automatické spouštěče:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-400">Systém aktivní</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">1. SMS potvrzení zákazníkovi:</span>
            <span className="font-semibold text-emerald-400">✓ Odesláno na {formData.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">2. E-mail potvrzení zákazníkovi:</span>
            <span className="font-semibold text-emerald-400">✓ Odesláno na {formData.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">3. Vytvořen CRM Lead & Projekt:</span>
            <span className="font-semibold text-amber-400">✓ Projekt "{formData.projectType} - {formData.fullName}"</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">4. AI Lead Scoring & Technik:</span>
            <span className="font-semibold text-amber-300">✓ 87/100 (Petr Novotný přiřazen)</span>
          </div>
        </div>

        <div className="pt-4 flex justify-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="px-6 py-3 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md transition-all"
          >
            Přejít do Přehledu zakázek
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8 pb-20 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Inteligentní formulář poptávky</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-1">{branding.name} — Poptávkový formulář</h2>
          <p className="text-xs text-slate-400 mt-0.5">Vyplňte 7 kroků poptávky pro okamžitý AI odhad a zařazení do CRM.</p>
        </div>
        <button
          onClick={onBackToDashboard}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
        >
          Zpět do CRM
        </button>
      </div>

      {/* Progress Bar & Steps Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span>Krok {step} ze 7: {
            step === 1 ? 'Kontaktní údaje' :
            step === 2 ? 'Typ projektu' :
            step === 3 ? 'Adresa a mapa' :
            step === 4 ? 'Rozpočet' :
            step === 5 ? 'Termín' :
            step === 6 ? 'Fotografie a AI Analýza' : 'Popis a Hlasový vstup'
          }</span>
          <span className="text-amber-400">{Math.round((step / 7) * 100)}% dokončeno</span>
        </div>
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-300 rounded-full bg-amber-500"
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        
        {/* STEP 1: Customer Information */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 1: Informace o zákazníkovi</h3>
              <p className="text-xs text-slate-400 mt-1">Zadejte své kontaktní údaje s živou validací.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Celé jméno / Obchodní firma *</label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ing. Jan Svoboda"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Telefonní číslo *</label>
                  <div className="relative mt-1">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+420 603 456 789"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">E-mailová adresa *</label>
                  <div className="relative mt-1">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jan.svoboda@example.cz"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
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
              <h3 className="text-lg font-bold text-slate-100">Krok 2: Typ stavebního projektu</h3>
              <p className="text-xs text-slate-400 mt-1">Vyberte kategorii stavby. AI předpřipraví materiálový list.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {projectTypes.map((type) => {
                const isSelected = formData.projectType === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setFormData({ ...formData, projectType: type.id })}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg' 
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950'
                    }`}
                  >
                    <div className="text-3xl mb-3">{type.icon}</div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{type.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{type.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-400">
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
              <h3 className="text-lg font-bold text-slate-100">Krok 3: Adresa realizace & Geografický náhled</h3>
              <p className="text-xs text-slate-400 mt-1">Automatické doplnění adresy a ověření servisní zóny technika.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Místo stavby (Adresa s našeptávačem)</label>
                <div className="relative mt-1">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={`Zahradní 42, ${branding.city}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Live Map Preview Container */}
              <div className="h-56 bg-slate-950 rounded-2xl relative overflow-hidden border border-slate-800 p-4 flex flex-col justify-between shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
                
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-slate-900/90 text-slate-200 rounded-lg text-[10px] font-bold border border-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-amber-400" /> Servisní oblast: {branding.city} a okolí (do 45 km)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-800 text-emerald-400">
                    Oblast pokryta
                  </span>
                </div>

                <div className="relative z-10 flex items-center justify-center">
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl flex items-center gap-2 border border-slate-700">
                    <MapPin className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold">{formData.address || branding.city}</span>
                  </div>
                </div>

                <div className="relative z-10 text-[10px] text-slate-500 flex items-center justify-between">
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
              <h3 className="text-lg font-bold text-slate-100">Krok 4: Plánovaný rozpočet</h3>
              <p className="text-xs text-slate-400 mt-1">Nastavte posuvníkem předpokládanou investici pro optimální materiálovou skladbu.</p>
            </div>

            <div className="space-y-6 py-4">
              <div className="text-center space-y-1">
                <span className="text-3xl font-black text-amber-400 font-mono">
                  {formData.budgetValue.toLocaleString()} Kč
                </span>
                <p className="text-xs text-slate-400">
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
                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold text-slate-300">
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 50000 })} className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800">50 tis.</button>
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 100000 })} className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800">100 tis.</button>
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 250000 })} className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800">250 tis.</button>
                <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 500000 })} className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800">500 tis.+</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Preferred Date */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 5: Preferovaný termín realizace</h3>
              <p className="text-xs text-slate-400 mt-1">Kdy byste si přáli zahájit montáž nebo zaměření?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Datum zahájení</label>
                <div className="relative mt-1">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl text-xs text-slate-300 space-y-1">
                <p className="font-bold text-amber-400">Informace o kapacitě:</p>
                <p>Termín v měsíci {new Date(formData.preferredDate).toLocaleString('cs', { month: 'long' })} má v {branding.city} aktuálně 3 volné montážní sloty.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Photo Upload & Instant AI Analysis */}
        {step === 6 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 6: Fotografie místa & Okamžitá AI Analýza</h3>
              <p className="text-xs text-slate-400 mt-1">Nahrajte fotografie nebo projektový nákres (JPG, PNG, HEIC, PDF). AI okamžitě odhadne složitost.</p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-colors bg-slate-950">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="inquiry-file-upload-v2"
                />
                <label htmlFor="inquiry-file-upload-v2" className="cursor-pointer space-y-2 block">
                  <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">Přetáhněte fotografie sem nebo klikněte pro výběr</p>
                  <p className="text-[11px] text-slate-500">Podpora formátů: JPG, PNG, HEIC, PDF (max 25MB)</p>
                </label>
              </div>

              {analyzingPhotos && (
                <div className="bg-slate-950 border border-amber-500/40 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-xs font-bold text-amber-400">AI analyzuje stavební prvky a terén...</span>
                </div>
              )}

              {aiAnalysisResult && (
                <div className="bg-slate-950 text-white p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">AI Analýza Poptávky</span>
                    </div>
                    <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      Informativní odhad (ne závazná nabídka)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Detekovaný typ</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{aiAnalysisResult.detectedType}</span>
                    </div>
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Odhadovaná složitost</span>
                      <span className="font-bold text-emerald-400 text-sm mt-0.5 block">{aiAnalysisResult.complexity}</span>
                    </div>
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Doporučený tým</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{aiAnalysisResult.suggestedTeam}</span>
                    </div>
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Doporučený další krok</span>
                      <span className="font-bold text-amber-300 text-xs mt-0.5 block">{aiAnalysisResult.recommendedNextStep}</span>
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
                <h3 className="text-lg font-bold text-slate-100">Krok 7: Detailní popis projektu & Hlasové zadání</h3>
                <p className="text-xs text-slate-400 mt-1">Můžete napsat detailní požadavky nebo nadiktovat hlasem.</p>
              </div>

              <button
                type="button"
                onClick={handleVoiceInputToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                  isRecordingVoice ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Mic className="w-4 h-4 text-rose-400" />
                <span>{isRecordingVoice ? 'Nahrávám hlas...' : 'Hlasové zadání'}</span>
              </button>
            </div>

            {isRecordingVoice && (
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex items-center justify-between animate-in fade-in text-xs text-rose-200">
                <div className="flex items-center gap-2 font-semibold">
                  <Volume2 className="w-4 h-4 text-rose-400 animate-ping" />
                  <span>Poslouchám váš hlas... Mluvte přirozeně česky.</span>
                </div>
                <div className="flex items-center gap-1">
                  {[40, 70, 95, 60, 30, 80, 50].map((h, i) => (
                    <div key={i} className="w-1 bg-rose-400 rounded-full animate-pulse" style={{ height: `${h / 2}px` }} />
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
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-medium text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-950 border border-slate-800 hover:bg-slate-800 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Zpět
            </button>
          ) : <div />}

          {step < 7 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-6 py-3 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md flex items-center gap-2 transition-all"
            >
              <span>Pokračovat na Krok {step + 1}</span> <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-8 py-3.5 rounded-xl text-xs font-extrabold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Odeslat poptávku (Vytvořit zakázku)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
