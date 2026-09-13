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
  Trash2
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
      <div className="max-w-3xl mx-auto py-12 px-6 sm:px-10 text-center space-y-6 bg-white rounded-[32px] shadow-xl my-4 font-sans border border-slate-200">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-green-100">
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
    <div className="max-w-6xl w-full mx-auto font-sans">
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 p-6 sm:p-10 lg:p-12 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Trust Badges, Value Proposition, Company Info (5 cols) */}
          <div className="lg:col-span-5 space-y-8 lg:sticky lg:top-8">
            <div className="space-y-3">
              <div 
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider"
                style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Oficiální poptávkový formulář</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                Získejte přesnou kalkulaci pro <span style={{ color: activeColor }}>{activeCompanyName}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Připravíme pro vás kompletní položkový rozpočet, časový harmonogram realizace a návrh nejvhodnějších materiálů.
              </p>
            </div>

            {/* Value Proposition List */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">Garance pevné ceny</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Schválená kalkulace je konečná bez skrytých víceprací.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                >
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">Dodržení termínu předání</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Smluvní pokuta za každý den prodlení z naší strany.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900">Vlastní certifikovaní řemeslníci</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Žádné neprověřené subdodávky. Zkušení stavbyvedoucí.</p>
                </div>
              </div>
            </div>

            {/* Company Dispatch Contact Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Potřebujete poradit ihned?</div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
                  style={{ backgroundColor: activeColor }}
                >
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Přímá linka na dispečink:</p>
                  <a href={`tel:${branding.phone || '+420 774 889 100'}`} className="text-base font-black text-slate-950 hover:underline">
                    {branding.phone || '+420 774 889 100'}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Form inputs (7 cols) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">Vyplňte podrobnosti zakázky</h3>
                <p className="text-xs text-slate-500 mt-1">Zabere to méně než 2 minuty. Pole označená * jsou povinná.</p>
              </div>

              {Object.keys(errors).length > 0 && (
                <div id="inquiry-error-banner" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>Prosím zkontrolujte povinná pole a vyplňte kontaktní údaje.</span>
                </div>
              )}

              {/* SECTION 1 – Contact */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: activeColor }}
                  >
                    1
                  </span>
                  <span>Kontaktní údaje</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Jméno a příjmení *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Ing. Jan Svoboda"
                        className={`w-full bg-slate-50 border rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          errors.fullName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-slate-100'
                        }`}
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-rose-600 font-bold mt-1">{errors.fullName}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Telefon *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+420 777 123 456"
                          className={`w-full bg-slate-50 border rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                            errors.phone ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-slate-100'
                          }`}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-rose-600 font-bold mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        E-mail *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          placeholder="jan.svoboda@example.cz"
                          className={`w-full bg-slate-50 border rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                            errors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-slate-100'
                          }`}
                        />
                      </div>
                      {errors.email && <p className="text-xs text-rose-600 font-bold mt-1">{errors.email}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Firma (volitelné)
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Název firmy s.r.o."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-t border-slate-200" />

              {/* SECTION 2 – Project Details */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: activeColor }}
                  >
                    2
                  </span>
                  <span>Informace o projektu</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Typ projektu / stavby
                    </label>
                    <select
                      value={formData.projectType}
                      onChange={e => setFormData({ ...formData, projectType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all cursor-pointer"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Místo stavby (Adresa)
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          value={formData.address}
                          onChange={e => setFormData({ ...formData, address: e.target.value })}
                          placeholder={`Zahradní 42, ${activeCity}`}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Preferovaný termín realizace
                        </label>
                      </div>

                      {/* Bounded date input with min/max limits & outer border wrapper */}
                      <div className="flex items-center w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 focus-within:ring-2 focus-within:ring-slate-100 focus-within:bg-white focus-within:border-slate-400 transition-all overflow-hidden shadow-2xs">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-2.5 pointer-events-none" />
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          max={new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0]}
                          value={formData.preferredDate}
                          onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                          className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-0 cursor-pointer appearance-none min-w-0"
                          style={{ WebkitAppearance: 'none', outline: 'none' }}
                        />
                      </div>

                      {formData.preferredDate && (
                        <p className="text-[11px] text-slate-500 my-1.5 font-semibold flex items-center justify-between">
                          <span>Vybrané datum:</span>
                          <span className="font-bold text-slate-950">
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

                      {/* Quick preset buttons (placed BELOW date picker) */}
                      <div className="mt-2.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Rychlá předvolba termínu:</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { label: '⚡ Co nejdříve', days: 14 },
                            { label: '📅 Do 1 měsíce', days: 30 },
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
                                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                                  isSelected
                                    ? 'shadow-xs ring-2 ring-blue-500/20'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                                style={
                                  isSelected
                                    ? { borderColor: activeColor, backgroundColor: `${activeColor}15`, color: activeColor }
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
              </div>

              <hr className="border-t border-slate-200" />

              {/* SECTION 3 – Description */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: activeColor }}
                  >
                    3
                  </span>
                  <span>Popis projektu & Podrobnosti</span>
                </h3>

                <div>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Popište svůj projekt co nejpodrobněji (rozměry, specifikace materiálů, požadavky)."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-sm font-medium text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 focus:bg-white transition-all resize-y"
                  />
                </div>
              </div>

              <hr className="border-t border-slate-200" />

              {/* SECTION 4 – Attachments */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <span 
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: activeColor }}
                  >
                    4
                  </span>
                  <span>Přílohy & Fotografie</span>
                </h3>

                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
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
                        className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto shadow-xs"
                        style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
                      >
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-900">Přetáhněte fotografie místa nebo klikněte pro výběr</p>
                      <p className="text-[11px] text-slate-500">Podpora fotografií, výkresů a PDF dokumentace</p>
                    </label>
                  </div>

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {formData.photos.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-900 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* GDPR & Submit */}
              <div className="pt-4 border-t border-slate-200 space-y-5">
                <div className="space-y-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.gdprConsent}
                      onChange={e => setFormData({ ...formData, gdprConsent: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      Souhlasím se zpracováním osobních údajů v souladu s GDPR pro účely zpracování cenové nabídky a realizace stavby.
                    </span>
                  </label>
                  {errors.gdpr && <p className="text-xs text-rose-600 font-bold">{errors.gdpr}</p>}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl text-sm sm:text-base font-extrabold text-white shadow-lg flex items-center justify-center gap-2.5 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
                    style={{ backgroundColor: activeColor, boxShadow: `0 8px 20px -4px ${activeColor}50` }}
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

        </div>
      </div>
    </div>
  );
};
