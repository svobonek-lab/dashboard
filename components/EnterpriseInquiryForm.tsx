import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  MapPin, 
  Calendar, 
  Check, 
  Mic, 
  Phone, 
  Mail, 
  User, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Trash2, 
  Square
} from 'lucide-react';
import { CompanyBranding } from '../types';
import { useBranding } from '@/hooks/useBranding';

interface EnterpriseInquiryFormProps {
  branding: CompanyBranding;
  onSubmit: (leadData: any) => void;
  onCancel?: () => void;
  isModal?: boolean;
  customColor?: string;
}

export const EnterpriseInquiryForm: React.FC<EnterpriseInquiryFormProps> = ({
  branding: propBranding,
  onSubmit,
  onCancel,
  isModal = false,
  customColor
}) => {
  const { branding } = useBranding();
  const activeColor = customColor || branding.primaryColor || propBranding.primaryColor || '#2563eb';
  const activeCompanyName = branding.name || propBranding.name || 'Stavební Firma';
  const activeCity = branding.city || propBranding.city || 'Praha';

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    company: '',
    projectType: 'Pergola',
    address: `Zahradní 42, ${activeCity}`,
    preferredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    description: '',
    photos: [] as string[],
    gdprConsent: false
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioRecorded, setAudioRecorded] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setAudioRecorded(false);
    } else {
      setIsRecording(false);
      setAudioRecorded(true);
      setFormData(prev => ({
        ...prev,
        description: prev.description ? `${prev.description}\n[Hlasová poznámka uložena (${recordingSeconds}s)]` : `[Hlasová poznámka uložena (${recordingSeconds}s)]`
      }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos = Array.from(files).map((f) => URL.createObjectURL(f));
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Zadejte jméno a příjmení';
    if (!formData.phone.trim() || formData.phone.length < 9) newErrors.phone = 'Zadejte platné telefonní číslo';
    if (!formData.email.trim() || !formData.email.includes('@')) newErrors.email = 'Zadejte platný e-mail';
    if (!formData.gdprConsent) newErrors.gdpr = 'Je nutné souhlasit se zpracováním osobních údajů';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      const firstError = document.getElementById('inquiry-error-banner');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      onSubmit({
        ...formData,
        price: 220000
      });
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="max-w-[1200px] mx-auto py-16 px-6 sm:px-10 text-center space-y-6 bg-white rounded-[24px] shadow-xl my-8 animate-in fade-in duration-300 font-sans border border-slate-200">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-950 tracking-tight">Děkujeme za vaši poptávku</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Váš požadavek pro společnost <strong style={{ color: activeColor }}>{activeCompanyName}</strong> byl úspěšně zaevidován. Náš dispečink vás bude kontaktovat.
          </p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-left space-y-3 max-w-md mx-auto text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Odesláno na:</span>
            <span className="font-bold text-slate-950">{formData.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Předpokládaná doba reakce:</span>
            <span className="font-bold text-slate-950">Do 24 hodin</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Přiřazený technik:</span>
            <span className="font-bold text-slate-950">Petr Novotný</span>
          </div>
        </div>

        <div className="pt-4 flex justify-center">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95"
              style={{ backgroundColor: activeColor }}
            >
              Zpět na přehled
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] min-w-[1280px] w-full mx-auto font-sans px-4 py-8">
      <form onSubmit={handleSubmit} className="bg-white rounded-[24px] shadow-xl border border-slate-200 p-8 lg:p-12 space-y-10">
        
        {/* Header Title */}
        <div className="border-b border-slate-200 pb-6">
          <h2 className="text-3xl font-black text-slate-950 tracking-tight">Nezávazná stavební poptávka</h2>
          <p className="text-sm text-slate-600 mt-1">Vyplňte údaje o vašem plánovaném projektu pro rychlé zpracování kalkulace.</p>
        </div>

        {Object.keys(errors).length > 0 && (
          <div id="inquiry-error-banner" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>Prosím zkontrolujte povinná pole a vyplňte kontaktní údaje.</span>
          </div>
        )}

        {/* Two-Column Desktop Layout (Bug 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          
          {/* LEFT COLUMN: Contact & Project Details */}
          <div className="space-y-8">
            
            {/* SECTION 1 – Contact */}
            <div className="space-y-5">
              <h3 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                <span>Kontaktní údaje</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Jméno a příjmení *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Ing. Jan Svoboda"
                      className={`w-full bg-slate-50 border rounded-xl py-3.5 pl-11 pr-4 text-base font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                        errors.fullName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                      }`}
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-rose-600 font-bold mt-1">{errors.fullName}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                      Telefon *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+420 777 123 456"
                        className={`w-full bg-slate-50 border rounded-xl py-3.5 pl-11 pr-4 text-base font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          errors.phone ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-rose-600 font-bold mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                      E-mail *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="jan.svoboda@example.cz"
                        className={`w-full bg-slate-50 border rounded-xl py-3.5 pl-11 pr-4 text-base font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          errors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-rose-600 font-bold mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Firma (volitelné)
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Název firmy s.r.o."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3.5 pl-11 pr-4 text-base font-medium text-slate-950 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-t border-slate-200" />

            {/* SECTION 2 – Project Details */}
            <div className="space-y-5">
              <h3 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>Informace o projektu</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                    Typ projektu / stavby ▼
                  </label>
                  <select
                    value={formData.projectType}
                    onChange={e => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3.5 px-4 text-base font-semibold text-slate-950 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="Pergola">Pergola</option>
                    <option value="Střecha">Střecha</option>
                    <option value="Dřevostavba">Dřevostavba</option>
                    <option value="Fasáda">Fasáda</option>
                    <option value="Rekonstrukce">Rekonstrukce</option>
                    <option value="Interiér">Interiér</option>
                    <option value="Jiné">Jiné</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                      Místo stavby (Adresa)
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder={`Zahradní 42, ${activeCity}`}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3.5 pl-11 pr-4 text-base font-medium text-slate-950 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                      Preferovaný termín
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                      <input
                        type="date"
                        value={formData.preferredDate}
                        onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3.5 pl-11 pr-4 text-base font-medium text-slate-950 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Description, Upload Photos, Voice Message */}
          <div className="space-y-8">
            
            {/* SECTION 3 – Description */}
            <div className="space-y-5">
              <h3 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                <span>Popis projektu & Podrobnosti</span>
              </h3>

              <div>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Popište svůj projekt co nejpodrobněji (rozměry, specifikace materiálů, požadavky)."
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-base font-medium text-slate-950 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all resize-y"
                />
              </div>
            </div>

            <hr className="border-t border-slate-200" />

            {/* SECTION 4 – Attachments & Voice Note */}
            <div className="space-y-5">
              <h3 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">4</span>
                <span>Přílohy & Hlasová zpráva</span>
              </h3>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="enterprise-form-photo-upload"
                  />
                  <label htmlFor="enterprise-form-photo-upload" className="cursor-pointer space-y-2 block">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm"
                      style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                    >
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">Přetáhněte fotografie místa nebo klikněte pro výběr</p>
                    <p className="text-xs text-slate-500">Podpora více fotografií, výkresů a PDF dokumentace</p>
                  </label>
                </div>

                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {formData.photos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Voice Recording Widget */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${isRecording ? 'bg-rose-600 animate-pulse' : 'bg-slate-900'}`}>
                      <Mic className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-950 text-xs">Hlasová poznámka</h4>
                      <p className="text-[11px] text-slate-500">
                        {isRecording ? `Nahrávám... (${recordingSeconds}s)` : audioRecorded ? 'Hlasová zpráva připravena' : 'Nadiktujte požadavek'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isRecording ? (
                      <button
                        type="button"
                        onClick={handleToggleRecord}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md flex items-center gap-2"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>Zastavit</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleToggleRecord}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center gap-2"
                      >
                        <Mic className="w-3.5 h-3.5 text-rose-400" />
                        <span>{audioRecorded ? 'Nahrát znovu' : 'Spustit'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: GDPR & Submit */}
        <div className="pt-6 border-t border-slate-200 space-y-6">
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.gdprConsent}
                onChange={e => setFormData({ ...formData, gdprConsent: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                Souhlasím se zpracováním osobních údajů v souladu s GDPR pro účely zpracování cenové nabídky a realizace stavby. <a href="#privacy" className="text-blue-600 font-semibold underline">Ochrana soukromí</a>.
              </span>
            </label>
            {errors.gdpr && <p className="text-xs text-rose-600 font-bold">{errors.gdpr}</p>}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl text-base font-black text-white shadow-xl flex items-center justify-center gap-3 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
              style={{ backgroundColor: activeColor, boxShadow: `0 10px 25px -5px ${activeColor}40` }}
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  <span>Odesílám poptávku...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Nezávazně odeslat poptávku</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
