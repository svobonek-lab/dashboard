import { useOrganization } from '@/context/OrganizationContext';
import React, { useState } from 'react';
import { 
  Sparkles, 
  Upload, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  User, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Trash2,
  Mic,
  Square,
  Volume2,
  Loader2
} from 'lucide-react';
import { CompanyBranding } from '../types';
import { useVoiceNotes } from '../hooks/useVoiceNotes';

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
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  const activeColor = customColor || branding.primaryColor || propBranding.primaryColor || '#2563eb';
  const activeCompanyName = branding.name || propBranding.name || 'Stavební Firma';
  const activeCity = branding.city || propBranding.city || 'Praha';

  const { 
    isRecording, 
    liveTranscript, 
    hasSpeechRecognition, 
    startRecording, 
    stopRecording 
  } = useVoiceNotes();

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
    gdprConsent: false,
    voiceNoteText: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const handleToggleVoiceNote = async () => {
    if (isRecording) {
      const result = await stopRecording();
      setFormData(prev => {
        const appendedDescription = prev.description 
          ? `${prev.description}\n\n[Hlasový přepis]: ${result.transcript}`
          : result.transcript;
        return {
          ...prev,
          voiceNoteText: result.transcript,
          description: appendedDescription
        };
      });
    } else {
      startRecording();
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-[1600px] mx-auto py-12 px-6 sm:px-10 text-center space-y-6 bg-white rounded-[24px] border border-slate-200 font-sans shadow-xs">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">Děkujeme za vaši poptávku</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Váš požadavek pro společnost <strong style={{ color: activeColor }}>{activeCompanyName}</strong> byl úspěšně zaevidován. Náš technik vás bude kontaktovat.
          </p>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left space-y-2.5 max-w-md mx-auto text-xs">
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

        <div className="pt-2 flex justify-center">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: activeColor }}
            >
              Zavřít
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-[1600px] mx-auto font-sans ${
      isModal 
        ? 'bg-transparent p-0 border-0 shadow-none' 
        : 'bg-white border border-slate-200 rounded-[24px] p-6 sm:p-10 lg:p-12 shadow-sm'
    }`}>
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Error Banner if validation fails */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"></span>
            <span>Prosím zkontrolujte povinné údaje a vyplňte zvýrazněná pole formuláře.</span>
          </div>
        )}

        {/* Master Form Grid: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: All primary textual inputs */}
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
                Kontaktní & Projektové Údaje
              </h3>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Jméno a příjmení *
                </label>
                <div className="relative">
                  <User className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ing. Jan Svoboda"
                    className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                      errors.fullName ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-slate-100'
                    }`}
                  />
                </div>
                {errors.fullName && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.fullName}</p>}
              </div>

              {/* Phone & Email side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Telefonní číslo *
                  </label>
                  <div className="relative">
                    <Phone className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+420 777 123 456"
                      className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                        errors.phone ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-slate-100'
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    E-mailová adresa *
                  </label>
                  <div className="relative">
                    <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jan.svoboda@email.cz"
                      className={`w-full bg-slate-50 border rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                        errors.email ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:ring-slate-100'
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-rose-600 font-semibold mt-1">{errors.email}</p>}
                </div>
              </div>

              {/* Company & Project Type side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Firma (Nepovinné)
                  </label>
                  <div className="relative">
                    <Building2 className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Název společnosti s.r.o."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    Typ poptávaného díla
                  </label>
                  <select
                    value={formData.projectType}
                    onChange={e => setFormData({ ...formData, projectType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="Pergola">Bioklimatická Pergola</option>
                    <option value="Střecha">Střecha & Krovy</option>
                    <option value="Dřevostavba">Tesařská Dřevostavba</option>
                    <option value="Fasáda">Odvětrávaná Fasáda</option>
                    <option value="Rekonstrukce">Celková Rekonstrukce</option>
                    <option value="Interiér">Vestavěný Interiér</option>
                    <option value="Jiné">Jiné stavební práce</option>
                  </select>
                </div>
              </div>

              {/* Address (Místo realizace) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Adresa realizace / staveniště
                </label>
                <div className="relative">
                  <MapPin className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder={`Zahradní 42, ${activeCity}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Preferred Date & Presets */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Preferovaný termín zahájení prací
                </label>
                <div className="flex items-center w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-slate-100 focus-within:bg-white focus-within:border-slate-300 transition-all overflow-hidden shadow-2xs">
                  <Calendar className="w-4.5 h-4.5 text-slate-400 shrink-0 mr-2.5 pointer-events-none" />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0]}
                    value={formData.preferredDate}
                    onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full bg-transparent border-0 p-0 text-sm font-bold text-slate-950 focus:outline-none focus:ring-0 cursor-pointer appearance-none min-w-0"
                    style={{ WebkitAppearance: 'none', outline: 'none' }}
                  />
                </div>

                {formData.preferredDate && (
                  <p className="text-[11px] text-slate-500 my-1.5 font-bold flex items-center justify-between px-1">
                    <span>Vybraný termín:</span>
                    <span className="font-extrabold text-slate-950">
                      {(() => {
                        try {
                          const d = new Date(formData.preferredDate);
                          return isNaN(d.getTime()) ? formData.preferredDate : d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
                        } catch {
                          return formData.preferredDate;
                        }
                      })()}
                    </span>
                  </p>
                )}

                {/* Quick presets list */}
                <div className="mt-3 space-y-1 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Rychlá předvolba:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '⚡ Co nejdříve', days: 14 },
                      { label: '📅 Do měsíce', days: 30 },
                      { label: '🗓️ Do 3 měsíců', days: 90 },
                      { label: '🌿 Příští sezónu', days: 180 }
                    ].map((preset) => {
                      const targetDate = new Date(Date.now() + preset.days * 86400000).toISOString().split('T')[0];
                      const isSelected = formData.preferredDate === targetDate;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData({ ...formData, preferredDate: targetDate })}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                            isSelected
                              ? 'shadow-xs ring-2 ring-brand-primary-soft'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                          style={
                            isSelected
                              ? { borderColor: activeColor, backgroundColor: `${activeColor}10`, color: activeColor }
                              : {}
                          }
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Description, Photo attachment, Voice Dictation */}
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeColor }} />
                Podrobnosti, Přílohy & Hlas
              </h3>
            </div>

            <div className="space-y-4">
              {/* Description Textarea */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Podrobný popis záměru / rozměry a požadavky
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Zadejte podrobnosti o zakázce (např. rozměry pergoly, sklon střechy, preferovaný materiál, specifické přání na elektroinstalaci apod.)."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all resize-y"
                />
              </div>

              {/* Photo Upload Zone */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Fotografie místa realizace / Výkresy (Nepovinné)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-slate-300 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="enterprise-photo-file-picker"
                  />
                  <label htmlFor="enterprise-photo-file-picker" className="cursor-pointer space-y-2 block">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto shadow-2xs"
                      style={{ backgroundColor: `${activeColor}10`, color: activeColor }}
                    >
                      <Upload className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Přetáhněte fotografie nebo klikněte</p>
                    <p className="text-[10px] text-slate-400">Podpora souborů JPG, PNG, PDF až do 10MB</p>
                  </label>
                </div>

                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3 animate-in fade-in">
                    {formData.photos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-2xs group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-950/70 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice Note Recorder (Desktop Grade Integration) */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Diktování poptávky hlasem (Převod na text)
                </label>
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          {isRecording ? 'Nahrávám hlášení...' : 'Hlasová asistence'}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {isRecording ? 'Diktujte detaily, poté uložte' : 'Nadiktujte poptávku česky'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleVoiceNote}
                      className={`px-4 py-2 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isRecording 
                          ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md' 
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                          <span>Zastavit & Přepsat</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-brand-primary shrink-0" style={{ color: activeColor }} />
                          <span>Začít diktovat</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Soundwave Simulation UI when recording */}
                  {isRecording && (
                    <div className="flex items-center justify-center gap-1 py-3 bg-white rounded-lg border border-slate-100">
                      {[24, 40, 16, 32, 48, 20, 36, 12, 28, 44].map((h, i) => (
                        <div 
                          key={i} 
                          className="w-1.5 bg-rose-500 rounded-full animate-bounce duration-300"
                          style={{ 
                            height: `${h}px`, 
                            animationDelay: `${i * 60}ms` 
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Transcript panel if recorded */}
                  {formData.voiceNoteText && !isRecording && (
                    <div className="p-3 bg-white rounded-lg border border-slate-100 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">✓ Přepis dokončen:</span>
                      <p className="text-xs text-slate-700 leading-relaxed italic font-medium">"{formData.voiceNoteText}"</p>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[9px] text-slate-400 font-bold">Přepis byl automaticky vložen do popisu výše</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, voiceNoteText: '' }))}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Vymazat záznam
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: Divider, GDPR, Actions */}
        <div className="pt-6 border-t border-slate-200 space-y-6">
          <div className="flex items-start gap-2.5 select-none cursor-pointer">
            <input
              type="checkbox"
              id="enterprise-form-gdpr"
              checked={formData.gdprConsent}
              onChange={e => setFormData({ ...formData, gdprConsent: e.target.checked })}
              className="mt-0.5 w-4.5 h-4.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary-soft cursor-pointer shrink-0"
            />
            <label htmlFor="enterprise-form-gdpr" className="text-xs text-slate-500 leading-relaxed cursor-pointer font-medium">
              Souhlasím se zpracováním mých kontaktních a osobních údajů společností <strong>{activeCompanyName}</strong> za účelem kalkulace cenové nabídky a technického zaměření staveniště, v souladu se směrnicí GDPR.
            </label>
          </div>
          {errors.gdpr && <p className="text-xs text-rose-600 font-bold px-1">{errors.gdpr}</p>}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full sm:w-auto px-6 py-4.5 rounded-xl text-xs font-black text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-center cursor-pointer uppercase tracking-wider"
              >
                Zrušit poptávku
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 max-w-xl py-4.5 rounded-xl text-sm sm:text-base font-extrabold text-white flex items-center justify-center gap-2.5 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-lg"
              style={{ backgroundColor: activeColor, boxShadow: `0 8px 24px -6px ${activeColor}50` }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Odesílám a počítám rozpočet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Odeslat poptávku & spočítat kalkulaci</span>
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
