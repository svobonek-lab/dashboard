import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Upload, 
  Palette, 
  Users, 
  MapPin, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  Phone, 
  Plus, 
  Trash2, 
  Navigation, 
  Globe, 
  ShieldCheck, 
  Check, 
  Sliders, 
  Layers, 
  RefreshCw,
  Send,
  Lock,
  Zap,
  Award
} from 'lucide-react';
import { CompanyBranding, Employee, Lead } from '../types';
import { generateRealisticLeads } from '../lib/demoData';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranding: CompanyBranding;
  onCompleteOnboarding: (
    updatedBranding: CompanyBranding, 
    updatedEmployees: Employee[], 
    generatedLeads: Lead[]
  ) => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  currentBranding,
  onCompleteOnboarding,
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  // Step 1: Logo & Company Info
  const [companyName, setCompanyName] = useState(currentBranding.name || 'Novák Dřevostavby s.r.o.');
  const [companyCity, setCompanyCity] = useState(currentBranding.city || 'Praha');
  const [companyAddress, setCompanyAddress] = useState(currentBranding.address || 'Průmyslová 14, 102 00 Praha 10');
  const [logoUrl, setLogoUrl] = useState(currentBranding.logoUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=300&q=80');
  const [isExtractingColors, setIsExtractingColors] = useState(false);

  // Step 2: Brand Colors
  const [primaryColor, setPrimaryColor] = useState(currentBranding.primaryColor || '#2563eb');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [detectedPalettes, setDetectedPalettes] = useState([
    { name: 'Modern Sapphire', primary: '#2563eb', accent: '#38bdf8', preview: 'bg-blue-600' },
    { name: 'Nordic Forest', primary: '#059669', accent: '#34d399', preview: 'bg-green-600' },
    { name: 'Warm Terracotta', primary: '#ea580c', accent: '#fbbf24', preview: 'bg-blue-600' },
    { name: 'Slate Executive', primary: '#334155', accent: '#60a5fa', preview: 'bg-slate-700' },
    { name: 'Luxury Amber', primary: '#d97706', accent: '#fde047', preview: 'bg-amber-600' }
  ]);

  // Step 3: Employees
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: 'emp-1',
      name: 'Petr Novotný',
      specialization: 'Mistr tesař & Pergoly',
      phone: '+420 777 123 456',
      email: 'petr.novotny@firma.cz',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      capacity: 85,
      maxCapacity: 100,
      todaysJobsCount: 2,
      status: 'Green',
      currentLocation: `${companyCity}, Zahradní 12`,
      distanceKm: 4.5
    },
    {
      id: 'emp-2',
      name: 'Martin Kovář',
      specialization: 'Střechy a krytiny',
      phone: '+420 777 234 567',
      email: 'martin.kovar@firma.cz',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      capacity: 90,
      maxCapacity: 100,
      todaysJobsCount: 1,
      status: 'Orange',
      currentLocation: `${companyCity}, Hlavní 10`,
      distanceKm: 8.0
    },
    {
      id: 'emp-3',
      name: 'Jakub Černý',
      specialization: 'Montážník & Zateplení fasád',
      phone: '+420 777 345 678',
      email: 'jakub.cerny@firma.cz',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      capacity: 65,
      maxCapacity: 100,
      todaysJobsCount: 1,
      status: 'Green',
      currentLocation: `${companyCity}, Nádražní 4`,
      distanceKm: 12.0
    }
  ]);

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Montážní technik');
  const [newEmpPhone, setNewEmpPhone] = useState('+420 777 ');

  // Step 4: Service Area & Radius
  const [serviceRadius, setServiceRadius] = useState(45);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    companyCity,
    'Okolí do 45 km',
    'Středočeský kraj'
  ]);
  const [freeTravelKm, setFreeTravelKm] = useState(25);

  // Step 5: Email & SMS Connection
  const [emailProvider, setEmailProvider] = useState<'google' | 'microsoft' | 'smtp'>('google');
  const [emailAddress, setEmailAddress] = useState(`info@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.cz`);
  const [smsSenderId, setSmsSenderId] = useState(companyName.substring(0, 11).toUpperCase());
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [isSmsVerified, setIsSmsVerified] = useState(true);

  // Step 6: Completion celebration & generation
  const [isGeneratingProjects, setIsGeneratingProjects] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(4);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  // Handle Logo Upload & Auto Color Extraction
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsExtractingColors(true);
      const fakeUrl = URL.createObjectURL(file);
      setLogoUrl(fakeUrl);
      
      // AI Color Detection simulation
      setTimeout(() => {
        setIsExtractingColors(false);
        setPrimaryColor('#0284c7'); // Auto extracted high-vibrancy brand blue
        setAccentColor('#f59e0b');
      }, 1200);
    }
  };

  const handleAddEmployee = () => {
    if (!newEmpName.trim()) return;
    const newMember: Employee = {
      id: `emp-${Date.now()}`,
      name: newEmpName,
      specialization: newEmpRole,
      phone: newEmpPhone,
      email: `${newEmpName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@firma.cz`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      capacity: 50,
      maxCapacity: 100,
      todaysJobsCount: 0,
      status: 'Green',
      currentLocation: `${companyCity}, Centrum`,
      distanceKm: 5
    };
    setEmployees([...employees, newMember]);
    setNewEmpName('');
    setNewEmpPhone('+420 777 ');
  };

  const handleRemoveEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  const handleFinishOnboarding = () => {
    setIsGeneratingProjects(true);

    const updatedBranding: CompanyBranding = {
      ...currentBranding,
      name: companyName,
      city: companyCity,
      address: companyAddress,
      primaryColor: primaryColor,
      email: emailAddress,
      phone: employees[0]?.phone || currentBranding.phone,
      logoUrl: logoUrl,
      services: ['Pergoly & Terasy', 'Střechy a krovy', 'Dřevostavby na klíč', 'Fasády & Zateplení']
    };

    setTimeout(() => {
      const generatedProjects = generateRealisticLeads(updatedBranding);
      setIsGeneratingProjects(false);
      setCompleted(true);

      setTimeout(() => {
        onCompleteOnboarding(updatedBranding, employees, generatedProjects);
        localStorage.setItem('demofactory_onboarding_completed', 'true');
        onClose();
      }, 1800);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-50/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden relative"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* Wizard Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-900 font-black text-sm shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First-Run Setup</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800">
                  Krok {step} ze {totalSteps}
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {step === 1 && '1. Nahrání loga & Název společnosti'}
                {step === 2 && '2. Detekce & Výběr firemních barev'}
                {step === 3 && '3. Tým techniků & Řemeslníků'}
                {step === 4 && '4. Servisní oblast & Dojezdová zóna'}
                {step === 5 && '5. Propojení e-mailu & SMS brány'}
                {step === 6 && '6. Dokončení & Automatická generace dat'}
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5">
          <div 
            className="h-full transition-all duration-400 ease-out rounded-r-full"
            style={{ 
              width: completed ? '100%' : `${(step / totalSteps) * 100}%`, 
              backgroundColor: primaryColor 
            }}
          />
        </div>

        {/* Step Indicators Bar */}
        <div className="hidden sm:flex items-center justify-between px-6 py-2.5 bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500">
          {[
            { s: 1, label: 'Logo' },
            { s: 2, label: 'Barvy' },
            { s: 3, label: 'Tým' },
            { s: 4, label: 'Oblast' },
            { s: 5, label: 'E-mail' },
            { s: 6, label: 'Spuštění' }
          ].map((st) => (
            <div 
              key={st.s}
              onClick={() => st.s < step && setStep(st.s)}
              className={`flex items-center gap-1.5 cursor-pointer ${
                step === st.s ? 'text-blue-600' : st.s < step ? 'text-slate-700' : 'text-slate-500 opacity-60'
              }`}
            >
              <div 
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === st.s ? 'bg-blue-600 text-slate-900' : st.s < step ? 'bg-green-100 text-green-700 font-bold' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {st.s < step ? '✓' : st.s}
              </div>
              <span>{st.label}</span>
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Upload Logo & Basic Info */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Nahrajte logo vaší společnosti</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI z loga automaticky detekuje primární barvy pro klientský portál, nabídky a widget.
                </p>
              </div>

              {/* Logo Upload Box */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50/80 hover:border-blue-400 transition-all text-center">
                  <div className="relative group">
                    <img 
                      src={logoUrl} 
                      alt="Logo Preview" 
                      className="w-24 h-24 rounded-2xl object-cover shadow-md border border-slate-200"
                    />
                    <label 
                      htmlFor="onboarding-logo-file"
                      className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-slate-900 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-bold"
                    >
                      Změnit
                    </label>
                  </div>

                  <input 
                    type="file" 
                    id="onboarding-logo-file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                  />

                  <label 
                    htmlFor="onboarding-logo-file" 
                    className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nahrát nový soubor</span>
                  </label>
                  <span className="text-[10px] text-slate-500 mt-1">PNG, SVG, JPG do 5 MB</span>
                </div>

                <div className="sm:col-span-7 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Název firmy</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Novák Dřevostavby s.r.o."
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Sídlo / Město</label>
                      <input
                        type="text"
                        value={companyCity}
                        onChange={(e) => setCompanyCity(e.target.value)}
                        placeholder="Praha"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Ulice & ČP</label>
                      <input
                        type="text"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="Průmyslová 14"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {isExtractingColors && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900 animate-pulse font-bold">
                      <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                      <span>AI extrahuje barevnou paletu z nahraného loga...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Detect Brand Colors */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Detekce a nastavení barevné identity</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI navrhla harmonickou paletu odpovídající vašemu logu a stavebnímu odvětví.
                </p>
              </div>

              {/* Color Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {detectedPalettes.map((pal) => {
                  const isSelected = primaryColor.toLowerCase() === pal.primary.toLowerCase();
                  return (
                    <div
                      key={pal.name}
                      onClick={() => {
                        setPrimaryColor(pal.primary);
                        setAccentColor(pal.accent);
                      }}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full shadow-xs" style={{ backgroundColor: pal.primary }} />
                        <div className="w-4 h-4 rounded-full shadow-xs" style={{ backgroundColor: pal.accent }} />
                        <span className="text-xs font-bold text-slate-900">{pal.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex justify-between items-center">
                        <span className="font-mono font-semibold">{pal.primary}</span>
                        {isSelected && <span className="text-blue-600 font-bold">✓ Vybráno</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Color Fine-Tuning */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    Manuální doladění odstínu
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold text-slate-700">{primaryColor}</span>
                  </div>
                </div>

                {/* Live Preview Bar */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">Ukázka tlačítka a akcentu:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      className="px-3.5 py-1.5 rounded-lg text-slate-900 font-bold text-xs shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Cenová nabídka
                    </button>
                    <span 
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-900"
                      style={{ backgroundColor: accentColor }}
                    >
                      Priorita 1
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Add Employees */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Přidejte techniky a montážníky</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Systém jim bude automaticky přiřazovat zakázky a optimalizovat trasy.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  {employees.length} aktivní technici
                </span>
              </div>

              {/* Employee List */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {employees.map((emp) => (
                  <div key={emp.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">{emp.name}</h5>
                        <p className="text-[11px] text-slate-500">{emp.specialization} • {emp.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        {emp.status === 'Green' ? 'Dostupný' : emp.status === 'Orange' ? 'Na výjezdu' : 'Vytížen'}
                      </span>
                      {employees.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveEmployee(emp.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Employee Form */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
                <span className="text-xs font-bold text-blue-900 block">+ Přidat dalšího člena týmu</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Jméno a příjmení"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Pozice (např. Tesařský mistr)"
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="+420 777 ..."
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddEmployee}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  Uložit člena týmu
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Define Service Area */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Definujte servisní rádius a lokalitu</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI kontroluje poptávky podle dojezdové vzdálenosti a počítá náklady na dopravu.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Maximální dojezdový rádius:</label>
                  <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                    {serviceRadius} km od {companyCity}
                  </span>
                </div>

                <input
                  type="range"
                  min={15}
                  max={120}
                  step={5}
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                {/* Simulated Interactive Coverage Box */}
                <div className="h-44 bg-slate-50 rounded-2xl relative overflow-hidden border border-slate-200 p-4 flex flex-col justify-between shadow-inner text-slate-900">
                  <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-900 rounded-lg text-[10px] font-bold border border-slate-300 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-400" />
                      Centrála: {companyAddress || companyCity}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                      Pokrytí: ~1 200 km²
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-blue-400 bg-blue-500/20 flex items-center justify-center animate-pulse">
                      <MapPin className="w-6 h-6 text-rose-500 fill-rose-500" />
                    </div>
                  </div>

                  <div className="relative z-10 text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Doprava zdarma: do {freeTravelKm} km</span>
                    <span>Nad limit: 14 CZK / km</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Connect Email & SMS Gateway */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Propojte odesílací e-mail & SMS bránu</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Slouží k automatickému odesílání rozpočtů, termínů schůzek a SMS potvrzení klientům.
                </p>
              </div>

              <div className="space-y-4">
                {/* Email Service Options */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'google', name: 'Google Workspace', desc: 'Gmail API' },
                    { id: 'microsoft', name: 'Microsoft 365', desc: 'Outlook Exchange' },
                    { id: 'smtp', name: 'Vlastní SMTP/IMAP', desc: 'Custom Server' }
                  ].map((prov) => (
                    <div
                      key={prov.id}
                      onClick={() => setEmailProvider(prov.id as any)}
                      className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                        emailProvider === prov.id
                          ? 'border-blue-600 bg-blue-50/40' 
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <h5 className="font-bold text-slate-900 text-xs">{prov.name}</h5>
                      <p className="text-[10px] text-slate-500">{prov.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Odesílací e-mail pro nabídky</label>
                    <div className="relative mt-1">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">SMS Odesílatel (Alfanumerické ID)</label>
                    <div className="relative mt-1">
                      <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        maxLength={11}
                        value={smsSenderId}
                        onChange={(e) => setSmsSenderId(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">Zobrazí se zákazníkům jako odesílatel SMS (např. {smsSenderId})</span>
                  </div>
                </div>

                {/* Connection Verified Badge */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between text-xs text-green-900">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>E-mail & SMS brána úspěšně ověřena (SSL 256-bit)</span>
                  </div>
                  <span className="text-[10px] font-bold bg-green-200 text-green-900 px-2 py-0.5 rounded-md">Připraveno</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Finish & Auto-Generation Celebration */}
          {step === 6 && (
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95">
              {isGeneratingProjects ? (
                <div className="space-y-4 py-8">
                  <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-900">AI konfiguruje vaše pracovní prostředí...</h4>
                    <p className="text-xs text-slate-500">
                      Generuji realistické ukázkové zakázky v lokalitě {companyCity} a přiřazuji váš tým.
                    </p>
                  </div>
                </div>
              ) : completed ? (
                <div className="space-y-4 py-4 animate-in fade-in">
                  <div className="w-16 h-16 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-green-100">
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-slate-900">Vše je dokonale nastaveno!</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Vítejte v <span className="font-bold text-slate-800">{companyName}</span> CRM. Vaše prostředí je připraveno s novou barevnou identitou, zaměstnanci a ukázkovými poptávkami.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-sm mx-auto text-xs space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vygenerované zakázky:</span>
                      <span className="font-bold text-slate-900">4 projekty v {companyCity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Aktivní tým:</span>
                      <span className="font-bold text-slate-900">{employees.length} specialistů</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dojezdová zóna:</span>
                      <span className="font-bold text-slate-900">{serviceRadius} km</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-blue-100">
                    <Sparkles className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xl font-black text-slate-900">Připraveno ke spuštění systému</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Kliknutím níže uložíte nastavení. AI automaticky vygeneruje realistické zakázky (pergoly, střechy, dřevostavby) pro město <span className="font-bold text-slate-800">{companyCity}</span>.
                    </p>
                  </div>

                  {/* Summary Checklist */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5 max-w-md mx-auto">
                    <div className="flex items-center gap-2 text-green-700 font-bold">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Logo a barva ({primaryColor}) nakonfigurována</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700 font-bold">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>{employees.length} členů týmu připraveno k přiřazování</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700 font-bold">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Servisní rádius ({serviceRadius} km) a doprava nastavena</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-700 font-bold">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>E-mail ({emailAddress}) & SMS ({smsSenderId}) aktivní</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Navigation Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
          {step > 1 && !isGeneratingProjects && !completed ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Zpět
            </button>
          ) : <div />}

          {!isGeneratingProjects && !completed && (
            step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(prev => prev + 1)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-900 shadow-md flex items-center gap-1.5 hover:opacity-95"
                style={{ backgroundColor: primaryColor }}
              >
                <span>Další ({step + 1}/{totalSteps})</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-slate-900 shadow-lg flex items-center gap-2 hover:opacity-95 animate-pulse"
                style={{ backgroundColor: primaryColor }}
              >
                <Zap className="w-4 h-4" /> Dokončit a spustit CRM
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
