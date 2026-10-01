import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Upload, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  ArrowLeft, 
  Mic, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  Navigation, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured, LocalSupabaseMock } from '../lib/supabase';

const DEFAULT_PROJECT_TYPES = [
  { id: 'Pergoly a zastřešení', title: 'Pergoly a zastřešení', desc: 'Hliníkové i dřevěné pergoly, bioklimatické systémy', icon: '🏡' },
  { id: 'Střechy a krov', title: 'Střechy a krov', desc: 'Kompletní realizace střech, opravy, krytiny', icon: '🏠' },
  { id: 'Zimní zahrady a terasy', title: 'Zimní zahrady a terasy', desc: 'Zasklení teras, dřevoplastové a dřevěné podlahy', icon: '☀️' },
  { id: 'Stavební práce a rekonstrukce', title: 'Stavební práce a rekonstrukce', desc: 'Domy na klíč, zednické práce, rekonstrukce', icon: '🏗️' }
];

export const WidgetIframePage: React.FC = () => {
  const [orgData, setOrgData] = useState<{ id: string; name: string; primary_color: string; logo_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    projectType: '',
    address: '',
    budgetValue: 0,
    preferredDate: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrgBranding() {
      const params = new URLSearchParams(window.location.search);
      const orgId = params.get('org');

      if (!orgId) {
        setOrgData(null);
        setLoading(false);
        return;
      }

      try {
        if (isSupabaseConfigured && supabase) {
          // Public branding is resolved through the staging app_* contract by tenant key.
          const { data, error } = await supabase.rpc('app_get_public_company', { p_public_key: orgId });

          if (!error && data && data.public_key && data.active !== false) {
            setOrgData({
              id: data.public_key,
              name: data.name || 'Stavební firma',
              primary_color: data.color || '#2563eb',
              logo_url: data.logo_url || ''
            });
          } else {
            setOrgData(null);
          }
        } else {
          // Non-production local fallback
          if (!(import.meta as any).env?.PROD) {
            const mockOrgs = LocalSupabaseMock.getOrganizations();
            const mockOrg = mockOrgs.find((o: any) => o.id === orgId || o.slug === orgId);
            if (mockOrg && (mockOrg.status === null || mockOrg.status === 'Active')) {
              setOrgData({
                id: mockOrg.id,
                name: mockOrg.name || 'Stavební Firma',
                primary_color: mockOrg.primary_color || '#2563eb',
                logo_url: mockOrg.logo_url || ''
              });
            } else {
              setOrgData(null);
            }
          } else {
            setOrgData(null);
          }
        }
      } catch (e) {
        console.warn('Failed to load public branding for iframe widget:', e);
        setOrgData(null);
      } finally {
        setLoading(false);
      }
    }

    loadOrgBranding();
  }, []);

  const validateStep1 = () => {
    const errors: any = {};
    if (!formData.fullName.trim()) errors.fullName = 'Zadejte své jméno';
    if (!formData.phone.trim()) errors.phone = 'Zadejte telefon';
    if (formData.email.trim() && !formData.email.includes('@')) errors.email = 'Zadejte platný e-mail';
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
      setFormData(prev => ({ ...prev, photos: ['photo1.jpg'] }));
      setAiAnalysisResult({
        detectedType: 'Terén',
        complexity: 'Nízká',
        suggestedTeam: 'Základní',
        recommendedNextStep: 'Pokračovat'
      });
      setAnalyzingPhotos(false);
    }, 1200);
  };

  const handleVoiceInputToggle = () => {
    setIsRecordingVoice(!isRecordingVoice);
  };

  // 2) Poptávku odešli přes the tenant-safe app_* intake RPC with an idempotency key.
  // Organizaci vždy bereš z parametru `org` v URL, ne z kontextu přihlášené firmy.
  const [requestKey] = useState(() => `web_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('org') || orgData?.id;

    if (!orgId || !orgData) {
      setSubmitError('Formulář není dostupný.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const notesParts = [
      formData.address ? `Adresa: ${formData.address}` : '',
      formData.preferredDate ? `Termín: ${formData.preferredDate}` : '',
      formData.description ? `Popis: ${formData.description}` : ''
    ].filter(Boolean);
    const combinedNotes = notesParts.join('\n');

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.rpc('app_submit_public_lead', {
          p_public_key: orgId,
          p_request_key: requestKey,
          p_customer: formData.fullName.trim(),
          p_phone: formData.phone.trim(),
          p_email: formData.email.trim() || null,
          p_title: formData.projectType.trim() || 'Poptávka z webu',
          p_description: combinedNotes || null,
          p_value: formData.budgetValue || 0
        });

        if (error) {
          console.error('app_submit_public_lead RPC error:', error);
          // 3) V produkčním buildu žádný fallback do localStorage: zobraz chybu a úspěch neukazuj
          setSubmitError('Poptávku se nepodařilo odeslat. Zkuste to prosím znovu nebo kontaktujte firmu přímo.');
          setIsSubmitting(false);
          return;
        }

        setSubmitted(true);
      } else {
        // No active Supabase configuration
        if ((import.meta as any).env?.PROD) {
          // 3) V produkčním buildu striktně hlásit chybu
          setSubmitError('Poptávku se nepodařilo odeslat.');
          setIsSubmitting(false);
          return;
        }

        // Local development mode only
        const mockAll = LocalSupabaseMock.getLeads();
        mockAll.unshift({
          id: 'mock-lead-' + Date.now(),
          organization_id: orgId,
          customer_name: formData.fullName.trim(),
          customerName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          customerPhone: formData.phone.trim(),
          email: formData.email.trim(),
          customerEmail: formData.email.trim(),
          title: formData.projectType ? `${formData.projectType} - ${formData.fullName.trim()}` : formData.fullName.trim(),
          project_type: formData.projectType || 'Poptávka',
          budget: formData.budgetValue || 0,
          price: formData.budgetValue || 0,
          address: formData.address || '',
          description: formData.description || '',
          preferredDate: formData.preferredDate || '',
          status: 'New',
          created_at: new Date().toISOString()
        } as any);
        LocalSupabaseMock.saveLeads(mockAll);
        setSubmitted(true);
      }
    } catch (err: any) {
      console.error('Widget submission error:', err);
      setSubmitError('Poptávku se nepodařilo odeslat. Zkuste to prosím znovu nebo kontaktujte firmu přímo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-[11px] font-semibold text-slate-500">Načítání widgetu...</p>
      </div>
    );
  }

  // 1) Pokud firma neexistuje, zobraz „Formulář není dostupný“ a odeslání zakaž.
  if (!orgData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-3 selection:bg-amber-500/30">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto shadow-xs">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Formulář není dostupný</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Organizace nebyla nalezena nebo není aktivní. Zkontrolujte prosím kód widgetu na svých stránkách.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = orgData.primary_color || '#2563eb';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans relative antialiased selection:bg-amber-500/30 select-none">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 space-y-4">
        {/* Top Header */}
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-200">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-xs flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {orgData.logo_url ? (
              <img src={orgData.logo_url} alt={orgData.name} className="w-full h-full object-cover" />
            ) : (
              orgData.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-600 truncate max-w-[160px]">{orgData.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-ping" />
              <span className="text-[9px] font-bold text-emerald-600">Aktivní</span>
            </div>
            <h3 className="text-xs font-bold text-slate-900 leading-none mt-0.5">Rychlá nezávazná poptávka</h3>
          </div>
        </div>

        {/* Dynamic Progress Indicator */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>{submitted ? 'Dokončeno!' : `Krok ${step} ze 7`}</span>
            <span>{submitted ? '100%' : `${Math.round((step / 7) * 100)}%`}</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ 
                width: submitted ? '100%' : `${(step / 7) * 100}%`,
                backgroundColor: primaryColor
              }}
            />
          </div>
        </div>

        {submitted ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900 tracking-tight">Poptávka byla odeslána!</h4>
              <p className="text-[11px] text-slate-600 leading-relaxed max-w-sm mx-auto">
                Děkujeme, <strong>{formData.fullName}</strong>. Vaše poptávka byla předána firmě <strong>{orgData.name}</strong>.
              </p>
            </div>

            {/* Recap info */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 text-left space-y-2 text-[11px] max-w-sm mx-auto shadow-2xs">
              <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] block border-b border-slate-100 pb-1.5">Shrnutí poptávky</span>
              <div className="flex justify-between items-center text-slate-700">
                <span>Poptávka pro firmu:</span>
                <span className="font-bold text-slate-900">{orgData.name}</span>
              </div>
              {formData.phone && (
                <div className="flex justify-between items-center text-slate-700">
                  <span>Kontaktní telefon:</span>
                  <span className="font-bold text-slate-900">{formData.phone}</span>
                </div>
              )}
              {formData.email && (
                <div className="flex justify-between items-center text-slate-700">
                  <span>E-mail:</span>
                  <span className="font-bold text-slate-900">{formData.email}</span>
                </div>
              )}
              {formData.projectType && (
                <div className="flex justify-between items-center text-slate-700">
                  <span>Druh stavby:</span>
                  <span className="font-bold text-slate-900">{formData.projectType}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  window.parent.postMessage('demofactory-widget-close', '*');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Zavřít okno
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STEP 1: Customer Contact */}
            {step === 1 && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">1. Kontaktní údaje</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kam vám zašleme cenovou nabídku?</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Celé jméno / Název firmy</label>
                    <div className="relative mt-1">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Zadejte své jméno"
                        className={`w-full bg-white border rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none ${
                          validationErrors.fullName ? 'border-rose-500' : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {validationErrors.fullName && <p className="text-[10px] text-rose-500 font-bold mt-1">{validationErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Telefonní číslo</label>
                    <div className="relative mt-1">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+420 ..."
                        className={`w-full bg-white border rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none ${
                          validationErrors.phone ? 'border-rose-500' : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {validationErrors.phone && <p className="text-[10px] text-rose-500 font-bold mt-1">{validationErrors.phone}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">E-mailová adresa</label>
                    <div className="relative mt-1">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="vas@email.cz"
                        className={`w-full bg-white border rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none ${
                          validationErrors.email ? 'border-rose-500' : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {validationErrors.email && <p className="text-[10px] text-rose-500 font-bold mt-1">{validationErrors.email}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Project Type Grid */}
            {step === 2 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">2. Typ stavebního projektu</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Zvolte hlavní kategorii požadované práce.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_PROJECT_TYPES.map((type) => {
                    const isSelected = formData.projectType === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => setFormData({ ...formData, projectType: type.id })}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="text-xl mb-1">{type.icon}</div>
                        <div>
                          <h5 className="font-bold text-slate-900 text-[11px]">{type.title}</h5>
                          <p className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">{type.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Location / Coverage Map */}
            {step === 3 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">3. Adresa realizace</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Zadejte místo stavby nebo obec.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lokalita realizace</label>
                    <div className="relative mt-1">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Město, ulice nebo PSČ"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Visual location card */}
                  <div className="h-28 bg-white rounded-xl relative overflow-hidden flex flex-col justify-between p-3 border border-slate-200">
                    <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
                    <div className="relative z-10 flex items-center justify-between text-[8px] font-bold text-slate-500">
                      <span className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-blue-600" /> Servisní oblast
                      </span>
                      <span className="text-emerald-600 font-bold">Dostupné</span>
                    </div>

                    <div className="relative z-10 flex justify-center">
                      <div className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-extrabold text-slate-800 flex items-center gap-1 border border-slate-200 shadow-xs">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span>{formData.address || 'Zadejte lokalitu výše'}</span>
                      </div>
                    </div>

                    <div className="relative z-10 text-[8px] text-slate-400 text-right font-semibold">
                      Konzultace a zaměření na místě
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Budget Slider */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">4. Odhadovaný rozpočet</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Orientační finanční rámec projektu.</p>
                </div>

                <div className="space-y-4 py-2">
                  <div className="text-center">
                    <span className="text-xl font-black text-slate-900">
                      {formData.budgetValue > 0 ? `${formData.budgetValue.toLocaleString('cs-CZ')} Kč` : 'Zatím nestanoveno'}
                    </span>
                    <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                      {formData.budgetValue === 0 ? 'Přesný rozpočet upřesníme po kalkulaci' :
                       formData.budgetValue < 120000 ? 'Standardní úsporné řešení' :
                       formData.budgetValue <= 280000 ? 'Prémiová kvalita & materiály' : 'Zakázkový komplexní projekt'}
                    </p>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={500000}
                    step={10000}
                    value={formData.budgetValue}
                    onChange={(e) => setFormData({ ...formData, budgetValue: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />

                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold text-slate-700">
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 50000 })} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">50k</button>
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 150000 })} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">150k</button>
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 250000 })} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">250k</button>
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 400000 })} className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">400k+</button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Date Selector */}
            {step === 5 && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">5. Plánovaný termín stavby</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kdy byste chtěli nejpozději zahájit práce?</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Požadované datum nebo předvolba</label>
                    
                    <div className="flex items-center w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-500 transition-all overflow-hidden shadow-2xs">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0]}
                        value={formData.preferredDate}
                        onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                        className="w-full bg-transparent border-0 p-0 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-0 cursor-pointer appearance-none min-w-0"
                        style={{ WebkitAppearance: 'none', outline: 'none' }}
                      />
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rychlá předvolba:</span>
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
                              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all text-center cursor-pointer ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-extrabold shadow-2xs'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
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
            )}

            {/* STEP 6: Document/Photo Upload & AI analysis */}
            {step === 6 && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">6. Fotografie / Podklady (nepovinné)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Nahrajte foto místa realizace nebo výkres.</p>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 text-center bg-white/50 cursor-pointer transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="iframe-photo-upload"
                  />
                  <label htmlFor="iframe-photo-upload" className="cursor-pointer space-y-1 block">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-[11px] font-bold text-slate-700">Klikněte pro výběr fotografií</p>
                    <p className="text-[9px] text-slate-400">Podporuje JPG, PNG (Max 10MB)</p>
                  </label>
                </div>

                {analyzingPhotos && (
                  <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-center gap-2 text-[10px] text-blue-700 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    <span>Zpracování nahraných podkladů...</span>
                  </div>
                )}

                {aiAnalysisResult && (
                  <div className="bg-white text-slate-900 p-3 rounded-xl space-y-2 text-[10px] border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span className="font-bold text-[9px] uppercase tracking-wider text-blue-600">Vyhodnocení podkladů</span>
                      </div>
                      <span className="text-[8px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                        Zpracováno
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 text-[8px] block">Složitost realizace</span>
                        <span className="font-bold text-slate-900 leading-tight mt-0.5 block">{aiAnalysisResult.complexity}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-slate-400 text-[8px] block">Doporučený tým</span>
                        <span className="font-bold text-slate-900 truncate block mt-0.5">{aiAnalysisResult.suggestedTeam}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 7: Comments & optional Voice Dictation */}
            {step === 7 && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">7. Doplňující popis</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Doplňte specifika, rozměry nebo dotazy.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVoiceInputToggle}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      isRecordingVoice ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecordingVoice ? 'Nahrávám...' : 'Diktovat'}</span>
                  </button>
                </div>

                {isRecordingVoice && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-[10px] text-rose-700">
                    <span className="font-bold animate-pulse">Nyní diktujte stavební záměr...</span>
                    <div className="flex gap-0.5 items-center">
                      {[30, 60, 20, 80, 40].map((h, i) => (
                        <div key={i} className="w-0.5 bg-rose-500 rounded-full animate-bounce" style={{ height: `${h / 4}px`, animationDelay: `${i * 100}ms` }} />
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Zadejte doplňující požadavky, rozměry nebo technické detaily..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Persistent Bottom Controls Bar */}
      {!submitted && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between z-20">
          {step > 1 ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setStep(prev => prev - 1)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Zpět
            </button>
          ) : <div />}

          {step < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1 transition-all cursor-pointer hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Pokračovat ({step + 1}/7)</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Odesílám...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Odeslat poptávku</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
