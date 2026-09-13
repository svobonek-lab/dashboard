import React, { useState, useEffect } from 'react';
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
  Volume2,
  Building2,
  FileCode,
  Globe
} from 'lucide-react';
import { supabase, isSupabaseConfigured, LocalSupabaseMock } from '../lib/supabase';
import { CompanyBranding } from '../types';

export const WidgetIframePage: React.FC = () => {
  const [orgData, setOrgData] = useState<{ id: string; name: string; primary_color: string; logo_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    projectType: 'Pergola',
    address: '',
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

  useEffect(() => {
    async function loadOrg() {
      const params = new URLSearchParams(window.location.search);
      const orgId = params.get('org');
      const customColor = params.get('color');

      if (!orgId) {
        setLoading(false);
        return;
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

          if (error) throw error;
          if (data) {
            setOrgData({
              id: data.id,
              name: data.name,
              primary_color: customColor || data.primary_color || '#2563eb',
              logo_url: data.logo_url
            });
            setFormData(prev => ({
              ...prev,
              address: `Zahradní 42, ${data.name.split(' ')[0] || 'Praha'}`
            }));
          }
        } catch (e) {
          console.error('Failed to load org from Supabase, loading from mock:', e);
          loadMockOrg(orgId, customColor);
        } finally {
          setLoading(false);
        }
      } else {
        loadMockOrg(orgId, customColor);
        setLoading(false);
      }
    }

    function loadMockOrg(orgId: string, customColor: string | null) {
      const mockOrgs = LocalSupabaseMock.getOrganizations();
      const match = mockOrgs.find(o => o.id === orgId);
      if (match) {
        setOrgData({
          id: match.id,
          name: match.name,
          primary_color: customColor || match.primary_color || '#2563eb',
          logo_url: match.logo_url
        });
        setFormData(prev => ({
          ...prev,
          address: `Zahradní 42, ${match.name.split(' ')[0] || 'Praha'}`
        }));
      } else {
        // Fallback default
        setOrgData({
          id: orgId,
          name: 'Stavební Firma s.r.o.',
          primary_color: customColor || '#2563eb'
        });
        setFormData(prev => ({
          ...prev,
          address: 'Zahradní 42, Praha'
        }));
      }
    }

    loadOrg();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-[11px] font-semibold text-slate-500">Načítání widgetu...</p>
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-xs font-bold text-rose-400">Chyba: Organizace nebyla nalezena.</p>
        <p className="text-[10px] text-slate-500 mt-1">Ověřte kód embed widgetu na svém webu.</p>
      </div>
    );
  }

  const activeColor = orgData.primary_color || '#f59e0b';

  const projectTypes = [
    { id: 'Pergola', title: 'Pergola', desc: 'Zastřešení & terasy', icon: '🪵' },
    { id: 'Roof', title: 'Střecha', desc: 'Krovy a krytiny', icon: '🏠' },
    { id: 'Reconstruction', title: 'Rekonstrukce', desc: 'Kompletní úpravy', icon: '🔨' },
    { id: 'Wooden House', title: 'Dřevostavba', desc: 'Domy na klíč', icon: '🌲' },
    { id: 'Facade', title: 'Fasáda', desc: 'Zateplení', icon: '🧱' },
    { id: 'Other', title: 'Ostatní práce', desc: 'Oplocení, zemní práce', icon: '⚡' }
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
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800'
        ]
      }));
      setAnalyzingPhotos(false);
      setAiAnalysisResult({
        detectedType: formData.projectType,
        complexity: 'Střední složitost (předpoklad 4-5 dní realizace)',
        suggestedTeam: 'Petr Novotný (Mistr tesař) + 2 montéři',
        recommendedNextStep: 'Zpracování položkového rozpočtu a rezervace materiálu.'
      });
    }, 1200);
  };

  const handleVoiceInputToggle = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      setTimeout(() => {
        setIsRecordingVoice(false);
        const transcript = "Poptávám zhotovení moderní pergoly 6x4m s hliníkovými lamelami a kotvením do fasády.";
        setFormData(prev => ({
          ...prev,
          description: prev.description ? `${prev.description} ${transcript}` : transcript
        }));
      }, 2500);
    } else {
      setIsRecordingVoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const leadRecord = {
      organization_id: orgData.id,
      customer_name: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      project_type: formData.projectType,
      budget: formData.budgetValue,
      status: 'New'
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.rpc('submit_public_lead', {
          p_org_id: orgData.id,
          p_customer_name: formData.fullName,
          p_phone: formData.phone,
          p_email: formData.email,
          p_project_type: formData.projectType,
          p_budget: formData.budgetValue
        });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to write widget lead to Supabase:', err);
        saveToLocalMock(leadRecord);
      }
    } else {
      saveToLocalMock(leadRecord);
    }

    // Post message to parent container to notify iframe of successful lead capture
    window.parent.postMessage({ type: 'demofactory-lead-created', lead: leadRecord }, '*');
  };

  function saveToLocalMock(lead: any) {
    const allLeads = LocalSupabaseMock.getLeads();
    allLeads.unshift({
      id: 'lead-widget-' + Date.now(),
      ...lead,
      created_at: new Date().toISOString()
    });
    LocalSupabaseMock.saveLeads(allLeads);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans relative antialiased selection:bg-amber-500/30 select-none">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-20 space-y-4">
        {/* Top Header */}
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-200">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-950 font-black text-xs shadow-sm flex-shrink-0 bg-amber-500"
          >
            {orgData.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{orgData.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 animate-ping" />
              <span className="text-[9px] font-bold text-green-400">Aktivní</span>
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
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-300 bg-amber-500"
              style={{ 
                width: submitted ? '100%' : `${(step / 7) * 100}%`
              }}
            />
          </div>
        </div>

        {submitted ? (
          /* Success Screen */
          <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-green-950 text-green-400 rounded-2xl flex items-center justify-center mx-auto border border-green-800 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-900 tracking-tight">Poptávka byla odeslána!</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
                Děkujeme, <strong className="text-amber-400">{formData.fullName}</strong>. Vaše poptávka byla uložena přímo do CRM systému firmy <strong className="text-slate-800">{orgData.name}</strong>.
              </p>
            </div>

            {/* Email & SMS Recap Notification */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 text-left space-y-2 text-[10px] max-w-sm mx-auto">
              <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[9px] block border-b border-slate-200 pb-1.5">Potvrzovací zprávy</span>
              <div className="flex justify-between items-center text-slate-700">
                <span>E-mail s rekapitulací:</span>
                <span className="font-bold text-green-400">✓ Odesláno na {formData.email}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>SMS potvrzení:</span>
                <span className="font-bold text-green-400">✓ Odesláno na {formData.phone}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Zodpovědný technik:</span>
                <span className="font-bold text-slate-900">Petr Novotný</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  window.parent.postMessage('demofactory-widget-close', '*');
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md transition-all"
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
                  <p className="text-[11px] text-slate-500 mt-0.5">Kam vám zašleme hotovou cenovou nabídku?</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Celé jméno / Název firmy</label>
                    <div className="relative mt-1">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Ing. Petr Novák"
                        className={`w-full bg-white border rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 ${
                          validationErrors.fullName ? 'border-rose-500' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {validationErrors.fullName && <p className="text-[10px] text-rose-400 font-bold mt-1">{validationErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Telefonní číslo</label>
                    <div className="relative mt-1">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+420 777 123 456"
                        className={`w-full bg-white border rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 ${
                          validationErrors.phone ? 'border-rose-500' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {validationErrors.phone && <p className="text-[10px] text-rose-400 font-bold mt-1">{validationErrors.phone}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">E-mailová adresa</label>
                    <div className="relative mt-1">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="novak@email.cz"
                        className={`w-full bg-white border rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 ${
                          validationErrors.email ? 'border-rose-500' : 'border-slate-200'
                        }`}
                      />
                    </div>
                    {validationErrors.email && <p className="text-[10px] text-rose-400 font-bold mt-1">{validationErrors.email}</p>}
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
                  {projectTypes.map((type) => {
                    const isSelected = formData.projectType === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => setFormData({ ...formData, projectType: type.id })}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected 
                            ? 'border-amber-500 bg-amber-500/10' 
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
                  <p className="text-[11px] text-slate-500 mt-0.5">Zadejte přesné místo pro plánování dojezdů řemeslníků.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lokalita realizace</label>
                    <div className="relative mt-1">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Pražská 42, Praha"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Virtual Map preview to save space inside iframe container */}
                  <div className="h-32 bg-white rounded-xl relative overflow-hidden flex flex-col justify-between p-3 border border-slate-200">
                    <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                    <div className="relative z-10 flex items-center justify-between text-[8px] font-bold text-slate-500">
                      <span className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5 text-amber-400" /> Servisní oblast {orgData.name.split(' ')[0]}
                      </span>
                      <span className="text-green-400 font-bold">Plné pokrytí</span>
                    </div>

                    <div className="relative z-10 flex justify-center">
                      <div className="px-2.5 py-1 bg-slate-50 rounded-lg text-[10px] font-extrabold text-slate-800 flex items-center gap-1 border border-slate-200 shadow-md">
                        <MapPin className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{formData.address || 'Region'}</span>
                      </div>
                    </div>

                    <div className="relative z-10 text-[8px] text-slate-500 text-right font-semibold">
                      Doprava v rámci nabídky zdarma
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
                  <p className="text-[11px] text-slate-500 mt-0.5">Pomůže nám vybrat ideální jakost materiálu a prvků.</p>
                </div>

                <div className="space-y-4 py-2">
                  <div className="text-center">
                    <span className="text-xl font-black text-amber-400">
                      {formData.budgetValue.toLocaleString()} CZK
                    </span>
                    <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                      {formData.budgetValue < 120000 ? 'Standardní úsporné řešení' :
                       formData.budgetValue <= 280000 ? 'Prémiová kvalita & doplňky' : 'Zakázkový luxusní projekt'}
                    </p>
                  </div>

                  <input
                    type="range"
                    min={40000}
                    max={500000}
                    step={10000}
                    value={formData.budgetValue}
                    onChange={(e) => setFormData({ ...formData, budgetValue: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />

                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold text-slate-700">
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 50000 })} className="p-1.5 bg-white hover:bg-slate-800 border border-slate-200 rounded-lg">50k</button>
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 150000 })} className="p-1.5 bg-white hover:bg-slate-800 border border-slate-200 rounded-lg">150k</button>
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 250000 })} className="p-1.5 bg-white hover:bg-slate-800 border border-slate-200 rounded-lg">250k</button>
                    <button type="button" onClick={() => setFormData({ ...formData, budgetValue: 400000 })} className="p-1.5 bg-white hover:bg-slate-800 border border-slate-200 rounded-lg">400k+</button>
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Výběr data nebo rychlá předvolba</label>
                    
                    <div className="flex items-center w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-500 transition-all overflow-hidden shadow-2xs">
                      <Calendar className="w-4 h-4 text-slate-500 shrink-0 mr-2 pointer-events-none" />
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
                                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-extrabold shadow-xs'
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

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[10px] text-blue-900">
                    <p className="font-bold">Kapacitní kalendář obvodu {formData.address.split(',')[1] || 'střední Čechy'}:</p>
                    <p className="mt-0.5 text-slate-700">Volné kapacity pro zaměření i naskladnění materiálu jsou plně dostupné.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: Document/Photo Upload & AI Terrain analysis */}
            {step === 6 && (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">6. Nahrání fotografií / Nákresu (AI Analýza)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Nahrajte foto místa realizace. AI okamžitě odhadne složitost montáže.</p>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-amber-500/50 rounded-xl p-4 text-center bg-white/50 cursor-pointer transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="iframe-photo-upload"
                  />
                  <label htmlFor="iframe-photo-upload" className="cursor-pointer space-y-1 block">
                    <Upload className="w-6 h-6 text-slate-500 mx-auto" />
                    <p className="text-[11px] font-bold text-slate-700">Klikněte pro výběr souboru</p>
                    <p className="text-[9px] text-slate-500">Podporuje JPG, PNG (Max 10MB)</p>
                  </label>
                </div>

                {analyzingPhotos && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-2 text-[10px] text-amber-300 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>AI analyzuje sklon terénu a podloží...</span>
                  </div>
                )}

                {aiAnalysisResult && (
                  <div className="bg-white text-slate-900 p-3 rounded-xl space-y-2 text-[10px] border border-slate-200">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span className="font-bold text-[9px] uppercase tracking-wider text-amber-400">AI Vyhodnocení</span>
                      </div>
                      <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
                        89% Přesnost
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 text-[8px] block">Složitost montáže</span>
                        <span className="font-bold text-slate-900 leading-tight mt-0.5 block">{aiAnalysisResult.complexity}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-500 text-[8px] block">Doporučená skupina</span>
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
                    <h4 className="text-sm font-bold text-slate-900">7. Doplňující popis & Hlas</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Doplňte detaily (rozměry, barvy, specifika).</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVoiceInputToggle}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      isRecordingVoice ? 'bg-rose-600 text-slate-900 animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-700'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>{isRecordingVoice ? 'Nahrávám...' : 'Diktovat'}</span>
                  </button>
                </div>

                {isRecordingVoice && (
                  <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center justify-between text-[10px] text-rose-300">
                    <span className="font-bold animate-pulse">Nyní diktujte stavební záměr česky...</span>
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
                  placeholder="Zadejte doplňující požadavky k materiálu nebo kotvení..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                />
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
              onClick={() => setStep(prev => prev - 1)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-800 border border-slate-200 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Zpět
            </button>
          ) : <div />}

          {step < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md flex items-center gap-1 transition-all"
            >
              <span>Pokračovat ({step + 1}/7)</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Odeslat poptávku
            </button>
          )}
        </div>
      )}
    </div>
  );
};
