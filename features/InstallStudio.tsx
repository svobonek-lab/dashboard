import React, { useState } from 'react';
import { 
  Rocket, 
  Globe, 
  Upload, 
  Palette, 
  Users, 
  MapPin, 
  Mail, 
  Phone,
  Building,
  Briefcase,
  Code2, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Copy, 
  ExternalLink,
  ShieldCheck, 
  CheckCircle2, 
  Layout,
  Smartphone,
  Eye,
  Plus,
  Trash2,
  QrCode,
  Layers,
  Wrench,
  Cpu,
  Monitor
} from 'lucide-react';
import { CompanyBranding, Employee } from '../types';
import { useOrganization } from '../context/OrganizationContext';

interface InstallStudioProps {
  currentBranding: CompanyBranding;
  onDeploy: (newBranding: Partial<CompanyBranding>, newEmployees?: Employee[]) => void;
  onClose?: () => void;
}

export const InstallStudio: React.FC<InstallStudioProps> = ({
  currentBranding,
  onDeploy,
  onClose
}) => {
  const { createCustomerAdmin, impersonateOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deploySuccessData, setDeploySuccessData] = useState<{
    orgId: string;
    crmUrl: string;
    portalUrl: string;
    formUrl: string;
    widgetScript: string;
  } | null>(null);

  // Preview tab in Step 4
  const [previewTab, setPreviewTab] = useState<'dashboard' | 'sidebar' | 'widget' | 'portal'>('dashboard');

  // STEP 1: Company & Branding
  const [companyName, setCompanyName] = useState('Pergoly & Dřevostavby Bohemia s.r.o.');
  const [websiteUrl, setWebsiteUrl] = useState('https://pergoly-bohemia.cz');
  const [phone, setPhone] = useState('+420 774 889 100');
  const [emailAddress, setEmailAddress] = useState('info@pergoly-bohemia.cz');
  const [address, setAddress] = useState('Průmyslová 1420, Praha 10');
  const [city, setCity] = useState('Praha a Středočeský kraj');
  const [logoPreview, setLogoPreview] = useState('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');

  // STEP 2: Services & Specializations
  const availableServicesList = [
    { id: 'pergolas', name: 'Pergoly & Terasy', icon: '🪵', desc: 'Hliníkové i dřevěné pergoly, bioklimatické systémy, terasová prkna' },
    { id: 'roofs', name: 'Střechy & Krovy', icon: '🏠', desc: 'Kompletní tesařské, pokrývačské a klempířské práce na klíč' },
    { id: 'wood', name: 'Dřevostavby na klíč', icon: '🌲', desc: 'Moderní nízkoenergetické rodinné domy a zahradní stavby' },
    { id: 'reconstruction', name: 'Rekonstrukce & Zednictví', icon: '🔨', desc: 'Kompletní renovace domů, bytových jader a komerčních prostor' },
    { id: 'facades', name: 'Fasády & Zateplení', icon: '🧱', desc: 'Kontaktní zateplovací systémy ETICS a designové fasádní obklady' },
    { id: 'interiors', name: 'Interiéry & Sádrokartony', icon: '🛋️', desc: 'SDK příčky, rastrové podhledy, akustické stěny a štukování' },
    { id: 'groundworks', name: 'Zemní & Základové práce', icon: '⚡', desc: 'Výkopové práce, betonové patky, základové desky a opěrné zdi' }
  ];

  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Pergoly & Terasy',
    'Střechy & Krovy',
    'Dřevostavby na klíč'
  ]);
  const [customServiceInput, setCustomServiceInput] = useState('');

  // STEP 3: Employees & Craftsmen
  const [employeesList, setEmployeesList] = useState<Array<{
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    avatar: string;
    specialization: string;
    capacity: number;
  }>>([
    {
      id: 'emp-1',
      name: 'Petr Novotný',
      role: 'Hlavní montér & Mistr tesař',
      phone: '+420 774 112 334',
      email: 'petr.novotny@bohemia.cz',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      specialization: 'Pergoly & Dřevostavby',
      capacity: 85
    },
    {
      id: 'emp-2',
      name: 'Marek Dvořák',
      role: 'Elektromontér & Pohony Somfy',
      phone: '+420 775 889 001',
      email: 'marek.dvorak@bohemia.cz',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      specialization: 'Elektroinstalace & LED',
      capacity: 60
    },
    {
      id: 'emp-3',
      name: 'Tomáš Kučera',
      role: 'Přípravář & Zámečník',
      phone: '+420 777 445 112',
      email: 'tomas.kucera@bohemia.cz',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      specialization: 'Kotvení & Hliníkové profily',
      capacity: 95
    }
  ]);

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Montér');
  const [newEmpPhone, setNewEmpPhone] = useState('+420 777 000 000');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpSpec, setNewEmpSpec] = useState('Montážní práce');
  const [newEmpCapacity, setNewEmpCapacity] = useState(80);

  const toggleService = (serviceName: string) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(selectedServices.filter(s => s !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  const handleAddCustomService = () => {
    if (customServiceInput.trim() && !selectedServices.includes(customServiceInput.trim())) {
      setSelectedServices([...selectedServices, customServiceInput.trim()]);
      setCustomServiceInput('');
    }
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    const newEmp = {
      id: `emp-${Date.now()}`,
      name: newEmpName,
      role: newEmpRole,
      phone: newEmpPhone,
      email: newEmpEmail || `${newEmpName.toLowerCase().replace(/\s+/g, '.')}@${websiteUrl.replace(/https?:\/\//, '').replace(/\/.*$/, '') || 'firma.cz'}`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      specialization: newEmpSpec,
      capacity: newEmpCapacity
    };
    setEmployeesList([...employeesList, newEmp]);
    setNewEmpName('');
    setNewEmpPhone('+420 777 000 000');
    setNewEmpEmail('');
  };

  const handleRemoveEmployee = (id: string) => {
    setEmployeesList(employeesList.filter(e => e.id !== id));
  };

  const handleDeployOS = async () => {
    setIsDeploying(true);
    try {
      const appHost = typeof window !== 'undefined' ? window.location.origin : 'https://app.stavbacore.cz';
      
      const newOrgData = await createCustomerAdmin({
        name: companyName,
        city,
        phone,
        email: emailAddress,
        website: websiteUrl,
        logo_url: logoPreview,
        primary_color: primaryColor,
        services: selectedServices,
        employees: employeesList.map(e => ({
          name: e.name,
          phone: e.phone,
          specialization: e.specialization || e.role,
          capacity: e.capacity
        }))
      });

      const orgId = newOrgData?.orgId || `org-${Date.now()}`;
      const crmUrl = `${appHost}/?org=${orgId}`;
      const portalUrl = `${appHost}/portal?org=${orgId}`;
      const formUrl = `${appHost}/inquiry?org=${orgId}`;
      const widgetScript = `<!-- StavbaCore OS Embeddable Lead Widget -->\n<script src="${appHost}/widget.js" data-org="${orgId}" data-color="${primaryColor}" async></script>`;

      setDeploySuccessData({
        orgId,
        crmUrl,
        portalUrl,
        formUrl,
        widgetScript
      });

      onDeploy({
        name: companyName,
        website: websiteUrl,
        phone,
        email: emailAddress,
        address,
        city,
        primaryColor,
        logoUrl: logoPreview,
        services: selectedServices
      });

      setCurrentStep(5);
    } catch (err) {
      console.error('Failed to deploy organization:', err);
      // Fallback local deployment
      onDeploy({
        name: companyName,
        website: websiteUrl,
        phone,
        email: emailAddress,
        address,
        city,
        primaryColor,
        logoUrl: logoPreview,
        services: selectedServices
      });
      setCurrentStep(5);
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const stepsList = [
    { num: 1, title: 'Firma & Branding', desc: 'Identita a barvy' },
    { num: 2, title: 'Služby & Řemesla', desc: 'Portfolio prací' },
    { num: 3, title: 'Tým & Kapacity', desc: 'Mistři a technici' },
    { num: 4, title: 'Živý náhled', desc: 'Interaktivní preview' },
    { num: 5, title: 'Nasazení & Přístupy', desc: 'Aktivace systému' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Install Studio 2.0</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  White Label Provisioner
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-1">
                Nasazení nového operačního systému stavby
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Multi-Tenant Engine: Aktivní</span>
          </div>
        </div>

        {/* 5-Step Stepper Header */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {stepsList.map((s) => {
            const isPassed = s.num < currentStep;
            const isCurrent = s.num === currentStep;
            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`text-left p-3 rounded-2xl transition-all border ${
                  isCurrent 
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/30' 
                    : isPassed
                    ? 'bg-slate-950 border-slate-800 text-emerald-400 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span>{s.num}. {s.title}</span>
                  {isPassed && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP CONTAINER */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-8 space-y-6">
        
        {/* STEP 1: Company & Branding */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Building className="w-5 h-5 text-amber-400" />
                  Krok 1: Firemní identita & vizuální styl
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Zadejte parametry stavební firmy. Systém na jejich základě vygeneruje unikátní klientský portál i interní CRM.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">Krok 1 / 5</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Název stavební firmy</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                  placeholder="např. Pergoly & Dřevostavby Bohemia s.r.o."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Webové stránky firmy</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-amber-400 focus:border-amber-500 focus:outline-none"
                    placeholder="https://vasefirma.cz"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Telefon na dispečink / kancelář</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                    placeholder="+420 777 123 456"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Centrální e-mail pro poptávky</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                    placeholder="poptavky@vasefirma.cz"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Sídlo / Adresa provozovny</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                    placeholder="Průmyslová 1420, Praha 10"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Region & Dojezdová spádová oblast</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  placeholder="např. Praha a Středočeský kraj (do 60 km)"
                />
              </div>
            </div>

            {/* Colors & Logo */}
            <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">Firemní logo</label>
                <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-900" />
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={logoPreview}
                      onChange={(e) => setLogoPreview(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
                      placeholder="URL loga..."
                    />
                    <div className="flex gap-2 text-[10px]">
                      <button 
                        type="button" 
                        onClick={() => setLogoPreview('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80')}
                        className="text-amber-400 hover:underline"
                      >
                        Dřevostavby
                      </button>
                      <span>•</span>
                      <button 
                        type="button" 
                        onClick={() => setLogoPreview('https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=160&q=80')}
                        className="text-amber-400 hover:underline"
                      >
                        Moderní stavby
                      </button>
                      <span>•</span>
                      <button 
                        type="button" 
                        onClick={() => setLogoPreview('https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=160&q=80')}
                        className="text-amber-400 hover:underline"
                      >
                        Architektura
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary & Secondary Color */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">Barevné schéma systému</label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Primární akcent (Tlačítka, aktivní prvky)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Sekundární tón (Sidebar & Panely)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <span>Pokračovat na Služby & Specializace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Services & Trades */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-400" />
                  Krok 2: Stavební služby & zaměření
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Vyberte činnosti, které firma realizuje. AI Dispatcher a kalkulační engine tyto obory automaticky použijí.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">Krok 2 / 5</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {availableServicesList.map((service) => {
                const isSelected = selectedServices.includes(service.name);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.name)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{service.icon}</span>
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                          isSelected ? 'bg-amber-500 text-slate-950 border-amber-400' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-100">{service.name}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{service.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Service Input */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
              <input
                type="text"
                value={customServiceInput}
                onChange={(e) => setCustomServiceInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomService()}
                placeholder="Přidat další specializovanou činnost (např. Klempířství, Zámečnictví)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomService}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Přidat</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zpět</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <span>Pokračovat na Tým & Řemeslníky</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Employees & Capacities */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  Krok 3: Tým mistrů, montérů a techniků
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Nastavte zaměstnance pro automatické plánování výjezdů, kalkulací a terénní mobilní přístup.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">Krok 3 / 5</span>
            </div>

            {/* List of current employees */}
            <div className="space-y-3">
              {employeesList.map((emp) => (
                <div key={emp.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img src={emp.avatar} alt={emp.name} className="w-11 h-11 rounded-xl object-cover border border-slate-700" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-100">{emp.name}</h4>
                        <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-md font-semibold border border-slate-700">
                          {emp.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {emp.phone} • {emp.specialization}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Kapacita</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${emp.capacity > 80 ? 'bg-rose-500' : emp.capacity > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${emp.capacity}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-300">{emp.capacity}%</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveEmployee(emp.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Employee Form */}
            <form onSubmit={handleAddEmployee} className="p-5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Přidat nového člena týmu</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Celé jméno</label>
                  <input
                    type="text"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="např. Jan Dvořák"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Pracovní pozice</label>
                  <input
                    type="text"
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    placeholder="např. Pokrývač / Tesař"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Telefonní číslo</label>
                  <input
                    type="text"
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="+420 777 ..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newEmpName.trim()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Uložit do seznamu zaměstnanců</span>
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zpět</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg transition-all"
              >
                <span>Pokračovat na Živý náhled</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Live Preview */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-amber-400" />
                  Krok 4: Živý náhled generovaného systému
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Zkontrolujte vzhled a chování systému před finálním nasazením pro firmu {companyName}.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">Krok 4 / 5</span>
            </div>

            {/* Preview Sub-tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
              {[
                { id: 'dashboard', label: 'Manažerský Dashboard', icon: Layout },
                { id: 'sidebar', label: 'Sidebar & Navigace', icon: Layers },
                { id: 'widget', label: 'Poptávkový Web Widget', icon: Smartphone },
                { id: 'portal', label: 'Klientský portál investora', icon: Monitor }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = previewTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setPreviewTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 shadow-md' 
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Interactive Preview Box */}
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 space-y-5 overflow-hidden">
              
              {previewTab === 'dashboard' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <img src={logoPreview} alt="" className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{companyName} — Manažerský Panel</h4>
                        <p className="text-[10px] text-slate-400">Lokalita: {city} • {selectedServices.length} aktivních oborů</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live Náhled
                    </span>
                  </div>

                  {/* Sample Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Poptávky tento měsíc</span>
                      <p className="text-2xl font-black text-slate-100 mt-1">24 zakázek</p>
                      <span className="text-[10px] text-emerald-400 font-bold">+18% z webu</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Objem rozpracovaných staveb</span>
                      <p className="text-2xl font-black text-slate-100 mt-1">4.8 mil. Kč</p>
                      <span className="text-[10px] text-amber-400 font-bold">12 aktivních smluv</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Vytížení týmu</span>
                      <p className="text-2xl font-black text-slate-100 mt-1">{employeesList.length} mistrů</p>
                      <span className="text-[10px] text-blue-400 font-bold">Průměrné vytížení 78%</span>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'sidebar' && (
                <div className="max-w-xs mx-auto p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3 p-2 bg-slate-950 rounded-xl">
                    <img src={logoPreview} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-100 truncate">{companyName}</p>
                      <p className="text-[9px] text-amber-400 font-mono">Stavební CRM</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    {['Přehled & Manažer', 'Zakázky (Leads)', 'Rozpočty & PDF', 'Kalendář & Montáže', 'Klientský portál'].map((item, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl font-medium flex items-center justify-between ${idx === 0 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
                        <span>{item}</span>
                        {idx === 0 && <span className="w-2 h-2 rounded-full bg-slate-950"></span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewTab === 'widget' && (
                <div className="max-w-sm mx-auto p-5 bg-slate-900 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                        ⚡
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">Nezávazná poptávka</h5>
                        <p className="text-[10px] text-slate-400">{companyName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <label className="text-[10px] text-slate-400 block">Zvolte typ stavby:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {selectedServices.slice(0, 4).map((s, i) => (
                        <div key={i} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-semibold text-slate-200 text-center">
                          {s}
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      style={{ backgroundColor: primaryColor }}
                      className="w-full py-2.5 text-white rounded-xl font-bold text-xs shadow-md mt-2"
                    >
                      Odeslat poptávku s AI kalkulací
                    </button>
                  </div>
                </div>
              )}

              {previewTab === 'portal' && (
                <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={logoPreview} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <h5 className="text-xs font-bold text-white">Portál pro investora</h5>
                        <p className="text-[10px] text-slate-400">Přístup klienta ke sledování průběhu stavby</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Stav: V realizaci (70%)
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                    <p className="font-semibold text-amber-400">Dnešní fotodokumentace ze stavby:</p>
                    <p className="text-[11px] text-slate-400 mt-1">Mistr Petr Novotný nahrál 3 fotky dokončené nosné konstrukce.</p>
                  </div>
                </div>
              )}

            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Zpět na Tým</span>
              </button>
              <button
                type="button"
                onClick={handleDeployOS}
                disabled={isDeploying}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm flex items-center gap-2.5 shadow-2xl transition-all disabled:opacity-50"
              >
                <Rocket className={`w-5 h-5 ${isDeploying ? 'animate-spin' : ''}`} />
                <span>{isDeploying ? 'Generuji a nasazuji instanci...' : 'Nasadit operační systém firmy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Deploy & Access Credentials */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-6 bg-gradient-to-r from-emerald-950/60 to-slate-900 rounded-3xl border border-emerald-500/40 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-white">
                Operační systém pro {companyName} je úspěšně aktivován!
              </h3>
              <p className="text-xs text-slate-300 max-w-xl mx-auto">
                Organizace, branding, klientský portál i poptávkový widget byly nakonfigurovány. Níže naleznete všechny přístupové odkazy a embed kódy.
              </p>
            </div>

            {/* Links & QR Code Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* CRM & Portal URLs */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Přístupové odkazy</h4>
                
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">1. Interní manažerské CRM</span>
                    <button
                      onClick={() => copyToClipboard(deploySuccessData?.crmUrl || window.location.href, 'crm')}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedUrl === 'crm' ? 'Zkopírováno!' : 'Kopírovat odkaz'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={deploySuccessData?.crmUrl || window.location.href}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
                  />
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">2. Klientský portál investora</span>
                    <button
                      onClick={() => copyToClipboard(deploySuccessData?.portalUrl || `${window.location.origin}/portal`, 'portal')}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedUrl === 'portal' ? 'Zkopírováno!' : 'Kopírovat odkaz'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={deploySuccessData?.portalUrl || `${window.location.origin}/portal`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300"
                  />
                </div>
              </div>

              {/* Embed Widget Script */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Embed kód pro web zákazníka</h4>
                  <button
                    onClick={() => copyToClipboard(deploySuccessData?.widgetScript || `<script src="https://app.stavbacore.cz/widget.js" data-org="${companyName}"></script>`, 'widget')}
                    className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedUrl === 'widget' ? 'Zkopírováno!' : 'Kopírovat HTML kód'}</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <textarea
                    rows={4}
                    readOnly
                    value={deploySuccessData?.widgetScript || `<script src="${window.location.origin}/widget.js" data-color="${primaryColor}" async></script>`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-emerald-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Vložte tento skript do zápatí webu ({websiteUrl}) pro aktivaci automatického sběru poptávek s AI kalkulátorem.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  setDeploySuccessData(null);
                }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                Vytvořit další firmu (Install Studio)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                }}
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl transition-all"
              >
                <span>Vstoupit do CRM {companyName}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
