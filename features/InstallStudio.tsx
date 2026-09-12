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
  Monitor,
  Lock,
  Download,
  FileText,
  AlertCircle,
  RefreshCw,
  Zap,
  Key
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CompanyBranding, Employee } from '../types';
import { useOrganization } from '../context/OrganizationContext';
import { analyzeWebsiteWithGemini } from '../lib/gemini';

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
  const [deployStepIndex, setDeployStepIndex] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  const [deploySuccessData, setDeploySuccessData] = useState<{
    orgId: string;
    ownerEmail: string;
    ownerPassword?: string;
    crmUrl: string;
    portalUrl: string;
    formUrl: string;
    widgetScript: string;
  } | null>(null);

  // Preview tab in Step 6
  const [previewTab, setPreviewTab] = useState<'dashboard' | 'sidebar' | 'widget' | 'portal' | 'mobile'>('dashboard');

  // STEP 1: Website Import & Validation
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isAiImporting, setIsAiImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [extractedScore, setExtractedScore] = useState<number | null>(null);
  const [missingNotice, setMissingNotice] = useState<string | null>(null);

  // STEP 2: Company Identity
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [logoPreview, setLogoPreview] = useState('https://images.unsplash.com/photo-1541888946425-d0fbb18f0653?auto=format&fit=crop&w=160&q=80');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');

  // STEP 3: Services & Specializations
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
    'Dřevostavby na klíč'
  ]);
  const [customServiceInput, setCustomServiceInput] = useState('');

  // STEP 4: Owner Account
  const [ownerName, setOwnerName] = useState('Jednatel společnosti');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('StavbaSecure2026!');
  const [ownerPhone, setOwnerPhone] = useState('');

  // STEP 5: Employees & Craftsmen
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
      role: 'Hlavní mistr realizací',
      phone: '+420 774 112 334',
      email: 'p.novotny@stavba.cz',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      specialization: 'Pergoly & Terasy',
      capacity: 85
    },
    {
      id: 'emp-2',
      name: 'Marek Dvořák',
      role: 'Vedoucí montér',
      phone: '+420 775 889 001',
      email: 'm.dvorak@stavba.cz',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      specialization: 'Dřevostavby na klíč',
      capacity: 90
    }
  ]);

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Mistr');
  const [newEmpPhone, setNewEmpPhone] = useState('+420 777 000 000');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpSpec, setNewEmpSpec] = useState('Montážní práce');
  const [newEmpCapacity, setNewEmpCapacity] = useState(80);

  // Deployment Steps
  const deploymentPhases = [
    'Validace webové adresy a parametrů firmy...',
    'Zpracování reálné vizuální identity...',
    'Vytváření záznamu organizace v public.organizations...',
    'Vytvoření administrátorského účtu v Supabase Auth...',
    'Registrace vazeb v public.organization_members...',
    'Provisioning týmu a mistrů v public.employees...',
    'Uložení white-label nastavení v public.company_settings...',
    'Generování úvodních klientských poptávek pro region...',
    'Synchronizace Super Adminu a aktivace linků...'
  ];

  // REAL WEBSITE EXTRACTION HANDLER
  const handleRealWebsiteImport = async (targetUrl?: string) => {
    const urlToAnalyze = (targetUrl || websiteUrl).trim();
    if (!urlToAnalyze) return;

    setIsAiImporting(true);
    setMissingNotice(null);
    setImportProgress('Připojuji se k webovému serveru...');

    try {
      const timeout1 = setTimeout(() => setImportProgress('Stahuji HTML a analyzuji OpenGraph data...'), 400);
      const timeout2 = setTimeout(() => setImportProgress('Detekuji reálné logo, favicon a barevnou paletu...'), 900);
      const timeout3 = setTimeout(() => setImportProgress('Čtu poskytované stavební služby a kontaktní údaje...'), 1400);

      const result = await analyzeWebsiteWithGemini(urlToAnalyze);

      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);

      const branding = result.branding;
      if (branding) {
        if (branding.name) setCompanyName(branding.name);
        if (branding.logoUrl) setLogoPreview(branding.logoUrl);
        if (branding.primaryColor) setPrimaryColor(branding.primaryColor);
        if (branding.phone) setPhone(branding.phone);
        if (branding.email) {
          setEmailAddress(branding.email);
          setOwnerEmail(branding.email);
        }
        if (branding.city) setCity(branding.city);
        if (branding.address) setAddress(branding.address);
        if (branding.services && branding.services.length > 0) {
          setSelectedServices(branding.services);
        }

        setExtractedScore(result.audit?.score || 88);

        // Check if any critical field was missing so user can confirm
        const missing = [];
        if (!branding.phone) missing.push('telefonní číslo');
        if (!branding.email) missing.push('e-mail');
        if (!branding.city) missing.push('město / region');
        if (missing.length > 0) {
          setMissingNotice(`Následující údaje nebyly na webu automaticky nalezeny: ${missing.join(', ')}. Prosím doplňte je v dalším kroku.`);
        }
      }

      setImportProgress('Extrakce dokončena!');
      setTimeout(() => {
        setIsAiImporting(false);
        setCurrentStep(2);
      }, 500);
    } catch (err: any) {
      console.warn('Real website extraction failed:', err);
      setIsAiImporting(false);
      // Derive clean name from URL directly
      let domainName = urlToAnalyze.replace(/https?:\/\//, '').replace('www.', '').split('/')[0];
      const clean = domainName.split('.')[0].replace(/[-_]/g, ' ');
      const derived = clean.charAt(0).toUpperCase() + clean.slice(1) + ' s.r.o.';
      setCompanyName(derived);
      setEmailAddress(`info@${domainName}`);
      setOwnerEmail(`info@${domainName}`);
      setCurrentStep(2);
    }
  };

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setLogoPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
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
      email: newEmpEmail || `${newEmpName.toLowerCase().replace(/\s+/g, '.')}@${websiteUrl ? websiteUrl.replace(/https?:\/\//, '').split('/')[0] : 'firma.cz'}`,
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

  // 9-STEP DEPLOYMENT PIPELINE
  const handleDeployOS = async () => {
    setIsDeploying(true);
    setDeployStepIndex(0);

    try {
      const finalName = companyName || 'Moje Stavební Firma s.r.o.';
      const res = await createCustomerAdmin({
        name: finalName,
        city: city || 'Česká republika',
        phone: phone || '+420 774 889 100',
        email: emailAddress || ownerEmail || 'info@firma.cz',
        website: websiteUrl || '',
        logo_url: logoPreview,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        address: address || '',
        owner_name: ownerName,
        owner_email: ownerEmail || emailAddress,
        owner_password: ownerPassword,
        services: selectedServices,
        employees: employeesList.map(e => ({
          name: e.name,
          phone: e.phone,
          email: e.email,
          specialization: e.specialization || e.role,
          capacity: e.capacity
        })),
        onStepProgress: (step) => {
          setDeployStepIndex(step);
        }
      });

      setDeployStepIndex(deploymentPhases.length - 1);

      setDeploySuccessData({
        orgId: res.orgId,
        ownerEmail: res.ownerEmail,
        ownerPassword: res.ownerPassword || ownerPassword,
        crmUrl: res.crmUrl,
        portalUrl: res.portalUrl,
        formUrl: res.formUrl,
        widgetScript: res.widgetScript
      });

      onDeploy({
        name: finalName,
        website: websiteUrl,
        phone,
        email: emailAddress,
        address,
        city,
        primaryColor,
        logoUrl: logoPreview,
        services: selectedServices
      });

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      setCurrentStep(7);
    } catch (err) {
      console.error('Failed to deploy organization:', err);
      setCurrentStep(7);
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const downloadHandoverPackage = () => {
    if (!deploySuccessData) return;
    const text = `=====================================================
PŘEDÁVACÍ PROTOKOL KLIENTSKÉHO CRM - BUILDFLOW OS
=====================================================
Firma: ${companyName}
Web: ${websiteUrl}
ID Organizace: ${deploySuccessData.orgId}
Datum nasazení: ${new Date().toLocaleString('cs-CZ')}

-----------------------------------------------------
1. PŘIHLAŠOVACÍ ÚDAJE SPRÁVCE (MAJITEL)
-----------------------------------------------------
E-mail: ${deploySuccessData.ownerEmail}
Heslo: ${deploySuccessData.ownerPassword || ownerPassword}
Administrace CRM: ${deploySuccessData.crmUrl}

-----------------------------------------------------
2. VEŘEJNÉ ODKAZY A PORTÁL
-----------------------------------------------------
Klientský portál pro zákazníky: ${deploySuccessData.portalUrl}
Poptávkový formulář pro web: ${deploySuccessData.formUrl}

-----------------------------------------------------
3. KÓD EMBED WIDGETU PRO VLOŽENÍ NA WEB
-----------------------------------------------------
${deploySuccessData.widgetScript}

=====================================================
Systém je připraven k okamžitému provozu.
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuildFlow-Predani-${companyName.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stepsList = [
    { num: 1, title: 'Web & Import', desc: 'Reálná URL adresa' },
    { num: 2, title: 'Identita', desc: 'Logo & kontakty' },
    { num: 3, title: 'Služby', desc: 'Portfolio řemesel' },
    { num: 4, title: 'Majitel', desc: 'Účet & heslo' },
    { num: 5, title: 'Tým', desc: 'Mistři & kapacity' },
    { num: 6, title: 'Náhled', desc: 'Live preview' },
    { num: 7, title: 'Nasazení', desc: 'Aktivace OS' }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 text-slate-900 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white p-8 border border-slate-200 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Install Studio 3.0</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Real Tenant Deployment System
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-1">
                Autonomní provisioning klientského CRM
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-50/80 px-3.5 py-2 rounded-xl border border-slate-200">
            <Cpu className="w-4 h-4 text-green-400 animate-pulse" />
            <span>Multi-Tenant Engine: Real Tenant Creator</span>
          </div>
        </div>

        {/* 7-Step Stepper Header */}
        <div className="mt-8 pt-6 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {stepsList.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                disabled={isDeploying || (s.num > currentStep && currentStep !== 7)}
                onClick={() => setCurrentStep(s.num)}
                className={`text-left p-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/50 text-slate-900 shadow-md'
                    : isCompleted
                    ? 'bg-slate-800/40 border-slate-300/50 text-slate-700 hover:bg-slate-800'
                    : 'bg-slate-50/40 border-slate-200/40 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                    isActive
                      ? 'bg-amber-500 text-slate-950'
                      : isCompleted
                      ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                  </span>
                  <span className="text-xs font-bold truncate">{s.title}</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate pl-6">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Website Import & Validation */}
      {currentStep === 1 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold mb-3">
              <Globe className="w-3.5 h-3.5" />
              <span>Krok 1: Extrakce reálného webu firmy</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Zadejte webovou stránku klienta</h2>
            <p className="text-xs text-slate-500 mt-1">
              Systém automaticky stáhne HTML, extrahuje originální logo, firemní barvy, služby, telefon a e-mail.
            </p>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Webová adresa (URL)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    placeholder="https://vasefirma.cz"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRealWebsiteImport();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={() => handleRealWebsiteImport()}
                  disabled={isAiImporting || !websiteUrl.trim()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 text-xs font-black transition-all shadow-lg flex items-center justify-center gap-2 shrink-0"
                >
                  {isAiImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{importProgress || 'Analyzuji web...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyzovat a extrahovat data</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Demo URLs */}
            <div className="pt-2">
              <span className="text-[11px] text-slate-500 block mb-2 font-mono">Vyzkoušejte rychlý import reálného webu:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'https://www.strechy-dolezal.cz',
                  'https://www.pergoly-morava.cz',
                  'https://www.woodcraft-stavby.cz'
                ].map((demo) => (
                  <button
                    key={demo}
                    onClick={() => {
                      setWebsiteUrl(demo);
                      handleRealWebsiteImport(demo);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-800 border border-slate-200 text-[11px] text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    {demo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(2)}
              className="text-xs text-slate-500 hover:text-slate-900 underline"
            >
              Přeskočit import a vyplnit údaje ručně
            </button>

            <button
              onClick={() => handleRealWebsiteImport()}
              disabled={!websiteUrl.trim() || isAiImporting}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all flex items-center gap-2"
            >
              <span>Pokračovat k identitě</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Company Identity */}
      {currentStep === 2 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold mb-3">
              <Building className="w-3.5 h-3.5" />
              <span>Krok 2: Firemní identita a kontakty</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Základní údaje společnosti</h2>
            <p className="text-xs text-slate-500 mt-1">
              Zkontrolujte a upravte extrahované údaje, které se propíší do klientského CRM i veřejného formuláře.
            </p>
          </div>

          {missingNotice && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{missingNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Název firmy *</label>
              <input
                type="text"
                placeholder="např. Pergoly & Terasy Praha s.r.o."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Webová stránka</label>
              <input
                type="text"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Telefon pro poptávky *</label>
              <input
                type="text"
                placeholder="+420 774 889 100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Oficiální e-mail *</label>
              <input
                type="email"
                placeholder="info@firma.cz"
                value={emailAddress}
                onChange={(e) => {
                  setEmailAddress(e.target.value);
                  if (!ownerEmail) setOwnerEmail(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sídlo / Ulice a č.p.</label>
              <input
                type="text"
                placeholder="Průmyslová 1420"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Město / Region působnosti</label>
              <input
                type="text"
                placeholder="Praha a Středočeský kraj"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Logo & Colors */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Firemní logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-600" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-900 cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Nahrát vlastní logo</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-500">Doporučeno PNG nebo SVG s transparentním pozadím.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Barva značky (Primary Color)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                />
                <div className="flex gap-1.5">
                  {['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPrimaryColor(c)}
                      className="w-6 h-6 rounded-full border border-slate-300 transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              disabled={!companyName.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all flex items-center gap-2"
            >
              <span>Pokračovat k portfoliu služeb</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Services & Specializations */}
      {currentStep === 3 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold mb-3">
              <Wrench className="w-3.5 h-3.5" />
              <span>Krok 3: Stavební řemesla a specializace</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Portfolio služeb pro poptávkový formulář</h2>
            <p className="text-xs text-slate-500 mt-1">
              Vyberte řemesla, která firma realizuje. Tyto položky se automaticky integrují do 3D poptávkového widgetu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableServicesList.map((srv) => {
              const isSelected = selectedServices.includes(srv.name);
              return (
                <div
                  key={srv.id}
                  onClick={() => toggleService(srv.name)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{srv.icon}</span>
                      <span className="text-xs font-bold text-slate-900">{srv.name}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'border border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">{srv.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Add custom service */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
            <input
              type="text"
              placeholder="Přidat další vlastní řemeslo (např. Bazény na klíč)..."
              value={customServiceInput}
              onChange={(e) => setCustomServiceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomService();
                }
              }}
              className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddCustomService}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-900 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Přidat</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              disabled={selectedServices.length === 0}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all flex items-center gap-2"
            >
              <span>Pokračovat k účtu majitele</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Owner Account */}
      {currentStep === 4 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Krok 4: Administrátorský účet majitele</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Přihlašovací údaje pro vedení firmy</h2>
            <p className="text-xs text-slate-500 mt-1">
              Vygenerovaný účet s rolí Owner bude mít plný přístup do CRM dashboardu a nastavení.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Jméno a příjmení jednatele / majitele</label>
              <input
                type="text"
                placeholder="Ing. Jan Novák"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Telefon majitele</label>
              <input
                type="text"
                placeholder="+420 777 123 456"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Přihlašovací e-mail majitele (Login) *</label>
              <input
                type="email"
                placeholder="novak@firma.cz"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Generované heslo *</label>
              <div className="relative">
                <input
                  type="text"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setOwnerPassword(`BuildFlow_${Math.floor(100000 + Math.random() * 900000)}!`)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-900 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět</span>
            </button>

            <button
              onClick={() => setCurrentStep(5)}
              disabled={!ownerEmail.trim() || !ownerPassword.trim()}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black transition-all flex items-center gap-2"
            >
              <span>Pokračovat k týmu řemeslníků</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Employees & Craftsmen */}
      {currentStep === 5 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold mb-3">
              <Users className="w-3.5 h-3.5" />
              <span>Krok 5: Tým řemeslníků a mistrů</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Stavební personál a kapacity</h2>
            <p className="text-xs text-slate-500 mt-1">
              Definujte mistry a montéry, kterým dispečer bude přiřazovat poptávky a stavby.
            </p>
          </div>

          <div className="space-y-3">
            {employeesList.map((emp) => (
              <div key={emp.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border border-slate-300" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{emp.name}</h4>
                    <p className="text-[11px] text-slate-500">{emp.role} • {emp.specialization}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{emp.phone} • {emp.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-500 font-mono block">Kapacita</span>
                    <span className="text-xs font-bold text-amber-400">{emp.capacity} %</span>
                  </div>
                  <button
                    onClick={() => handleRemoveEmployee(emp.id)}
                    className="p-2 rounded-xl bg-white hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Employee Form */}
          <form onSubmit={handleAddEmployee} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Přidat nového člena týmu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                placeholder="Jméno a příjmení"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="Pozice (např. Šéfmontér)"
                value={newEmpRole}
                onChange={(e) => setNewEmpRole(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="Telefon"
                value={newEmpPhone}
                onChange={(e) => setNewEmpPhone(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newEmpName.trim()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-900 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Přidat do týmu</span>
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět</span>
            </button>

            <button
              onClick={() => setCurrentStep(6)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-2"
            >
              <span>Zobrazit živý náhled systému</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: Live Preview & Confirmation */}
      {currentStep === 6 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold mb-3">
              <Eye className="w-3.5 h-3.5" />
              <span>Krok 6: Živý náhled před nasazením</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">White-Label vizualizace pro {companyName || 'Klienta'}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Podívejte se, jak bude klientský systém, portál a widget vypadat ihned po dokončení nasazení.
            </p>
          </div>

          {/* Preview Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'dashboard', label: 'CRM Dashboard', icon: Layout },
              { id: 'widget', label: 'Poptávkový Widget', icon: Code2 },
              { id: 'portal', label: 'Klientský Portál', icon: Globe },
              { id: 'mobile', label: 'Mobil pro mistry', icon: Smartphone }
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setPreviewTab(t.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    previewTab === t.id
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preview Container */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 min-h-[320px] flex flex-col justify-center">
            {previewTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <img src={logoPreview} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{companyName} OS</h4>
                      <p className="text-[10px] text-slate-500">StavbaCore Cloud CRM</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-900" style={{ backgroundColor: primaryColor }}>
                    Aktivní licence
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Nové poptávky</span>
                    <span className="text-lg font-black text-amber-400">3</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Rozpracované stavby</span>
                    <span className="text-lg font-black text-green-400">2</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Kapacita týmu</span>
                    <span className="text-lg font-black text-blue-400">88 %</span>
                  </div>
                </div>
              </div>
            )}

            {previewTab === 'widget' && (
              <div className="max-w-md mx-auto p-5 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <h4 className="text-xs font-bold text-slate-900">Nezávazná poptávka realizace</h4>
                </div>
                <p className="text-[11px] text-slate-500">Vyberte požadované stavební práce pro {city || 'váš region'}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedServices.slice(0, 4).map((s) => (
                    <span key={s} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-700">
                      {s}
                    </span>
                  ))}
                </div>
                <button className="w-full py-2 rounded-xl text-xs font-black text-slate-900 shadow-md mt-2" style={{ backgroundColor: primaryColor }}>
                  Spočítat orientační rozpočet
                </button>
              </div>
            )}

            {previewTab === 'portal' && (
              <div className="space-y-3 text-center max-w-sm mx-auto">
                <img src={logoPreview} alt="Logo" className="w-12 h-12 mx-auto rounded-xl object-contain bg-white p-1 border border-slate-200" />
                <h4 className="text-sm font-bold text-slate-900">Klientský portál zakázky</h4>
                <p className="text-xs text-slate-500">Přístup pro investora ke stavebnímu deníku, fakturám a harmonogramu.</p>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-left text-xs font-mono text-slate-700">
                  <p>Stav: 🟢 Stavba zahájena</p>
                  <p>Mistr: {employeesList[0]?.name || 'Vedoucí realizací'}</p>
                </div>
              </div>
            )}

            {previewTab === 'mobile' && (
              <div className="max-w-xs mx-auto p-4 bg-white rounded-3xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-500 pb-2 border-b border-slate-200">
                  <span>📱 Mobilní aplikace mistra</span>
                  <span>9:41</span>
                </div>
                <p className="font-bold text-slate-900">Dnešní výjezdy a montáže</p>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-amber-400 text-[11px]">8:00 - Zaměření pergoly</p>
                  <p className="text-[10px] text-slate-500">Ing. Tomáš Kučera ({city || 'Praha'})</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět</span>
            </button>

            <button
              onClick={handleDeployOS}
              disabled={isDeploying}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-sm font-black transition-all shadow-xl flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Nasadit firmu a aktivovat CRM</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 7: Nasazení dokončeno (Delivered Credentials & Live Links) */}
      {currentStep === 7 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-green-500/20 border border-green-500/40 text-green-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Klientské CRM bylo úspěšně vytvořeno!</h2>
            <p className="text-xs text-slate-500">
              Firma <strong>{companyName}</strong> byla plně nakonfigurována a zapsána do databáze.
            </p>
          </div>

          {deploySuccessData && (
            <div className="space-y-4">
              {/* Credentials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Owner Login Card */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Key className="w-4 h-4" />
                    <span>Přihlašovací údaje majitele</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500">E-mail:</span>
                      <span className="text-slate-900 font-bold">{deploySuccessData.ownerEmail}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                      <span className="text-slate-500">Heslo:</span>
                      <span className="text-amber-300 font-bold">{deploySuccessData.ownerPassword || ownerPassword}</span>
                    </div>
                  </div>
                </div>

                {/* Direct CRM Access Card */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <Layout className="w-4 h-4" />
                    <span>Přímý vstup do CRM administrace</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Okamžité otevření CRM nového klienta v režimu plného oprávnění:
                  </p>
                  <button
                    onClick={() => {
                      impersonateOrganization(deploySuccessData.orgId);
                      window.location.href = deploySuccessData.crmUrl;
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Otevřít nové CRM ({companyName})</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Public Links & Embed Widget */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Code2 className="w-4 h-4 text-green-400" />
                    <span>Integrační kód poptávkového widgetu pro web klienta</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(deploySuccessData.widgetScript, 'widget')}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-700 hover:text-slate-900 font-mono flex items-center gap-1.5 transition-colors"
                  >
                    {copiedUrl === 'widget' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl === 'widget' ? 'Zkopírováno' : 'Kopírovat kód'}</span>
                  </button>
                </div>

                <pre className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] font-mono text-green-400 overflow-x-auto whitespace-pre-wrap">
                  {deploySuccessData.widgetScript}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={downloadHandoverPackage}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-900 text-xs font-bold transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Stáhnout předávací protokol (.txt)</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (onClose) onClose();
                      window.location.href = '/admin/companies';
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-900 text-xs font-bold transition-all w-full sm:w-auto text-center"
                  >
                    Zobrazit v Super Adminu
                  </button>

                  <button
                    onClick={() => {
                      impersonateOrganization(deploySuccessData.orgId);
                      window.location.href = deploySuccessData.crmUrl;
                    }}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-lg w-full sm:w-auto text-center"
                  >
                    Přejít do CRM
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deploying Overlay Modal with 9-step progress */}
      {isDeploying && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-8 space-y-6 shadow-2xl text-center">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
            
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Nasazuji novou společnost</h3>
              <p className="text-xs text-slate-500">Probíhá zápis do databáze a generování tenant infrastruktury...</p>
            </div>

            <div className="space-y-2 text-left bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs">
              {deploymentPhases.map((phase, idx) => {
                const isPast = idx < deployStepIndex;
                const isCurrent = idx === deployStepIndex;
                return (
                  <div
                    key={phase}
                    className={`flex items-center gap-2 transition-all ${
                      isCurrent
                        ? 'text-amber-400 font-bold'
                        : isPast
                        ? 'text-green-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {isPast ? (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                    ) : (
                      <span className="w-3.5 h-3.5 shrink-0 text-center">•</span>
                    )}
                    <span className="truncate">{phase}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
