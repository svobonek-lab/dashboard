import React, { useState } from 'react';
import { 
  Rocket, 
  Globe, 
  Upload, 
  Palette, 
  Users, 
  MapPin, 
  Mail, 
  Code2, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  FileSpreadsheet,
  Layers,
  Cpu
} from 'lucide-react';
import { CompanyBranding, Employee } from '../types';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [celebration, setCelebration] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('Pergoly & Terasy Praha s.r.o.');
  const [websiteUrl, setWebsiteUrl] = useState('https://pergoly-praha.cz');
  const [logoPreview, setLogoPreview] = useState('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [serviceRadius, setServiceRadius] = useState(45); // km
  const [serviceCenter, setServiceCenter] = useState('Praha a Středočeský kraj');
  const [emailProvider, setEmailProvider] = useState<'gmail' | 'outlook' | 'custom'>('gmail');
  const [emailAddress, setEmailAddress] = useState('info@pergoly-praha.cz');
  const [emailConnected, setEmailConnected] = useState(true);

  // Employees Import
  const [employeesList, setEmployeesList] = useState<Array<{ name: string; role: string; phone: string; skills: string }>>([
    { name: 'Petr Novotný', role: 'Hlavní montér & tesař', phone: '+420 774 112 334', skills: 'Dřevostavby, Pergoly, Zastřešení' },
    { name: 'Marek Dvořák', role: 'Elektromontér & Smart Home', phone: '+420 775 889 001', skills: 'LED lišty, Pohony Somfy, Čidla' },
    { name: 'Tomáš Kučera', role: 'Přípravář & zámečník', phone: '+420 777 445 112', skills: 'Hliníkové profily, Kotvení, Nátěry' }
  ]);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');

  const widgetSnippet = `<script src="https://cdn.demofactory.io/widget.js" data-company="${companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}" data-color="${primaryColor}"></script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(widgetSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    setEmployeesList([...employeesList, {
      name: newEmpName,
      role: newEmpRole || 'Stavební technik',
      phone: '+420 777 000 111',
      skills: 'Montážní práce'
    }]);
    setNewEmpName('');
    setNewEmpRole('');
  };

  const handleDeployOS = () => {
    setIsDeploying(true);
    setTimeout(() => {
      setIsDeploying(false);
      setCelebration(true);
      setTimeout(() => {
        onDeploy({
          name: companyName,
          website: websiteUrl,
          primaryColor,
          logoUrl: logoPreview,
          city: serviceCenter,
          email: emailAddress
        });
      }, 2000);
    }, 2500);
  };

  const steps = [
    { num: 1, label: 'Název & Web', desc: 'Firma a doména' },
    { num: 2, label: 'Logo', desc: 'Vizuální identita' },
    { num: 3, label: 'Barvy', desc: 'Barevná paleta' },
    { num: 4, label: 'Tým', desc: 'Import techniků' },
    { num: 5, label: 'Oblast', desc: 'Akční rádius' },
    { num: 6, label: 'Email Sync', desc: 'Gmail / Outlook' },
    { num: 7, label: 'Widget Kód', desc: 'Generování skriptu' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 text-slate-100">
      {/* Top Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-lg">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Instalační konfigurátor stavebního ERP</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  /admin/install
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-1">Průvodce nastavením & Onboarding firmy</h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Instalační uzel: Připraven</span>
          </div>
        </div>

        {/* Horizontal Stepper */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="grid grid-cols-7 gap-2">
            {steps.map((s) => {
              const isPassed = s.num < currentStep;
              const isCurrent = s.num === currentStep;
              return (
                <button
                  key={s.num}
                  onClick={() => setCurrentStep(s.num)}
                  className={`text-left p-2.5 rounded-xl transition-all border ${
                    isCurrent 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                      : isPassed
                      ? 'bg-slate-950 border-slate-800 text-emerald-400 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span>{s.num}. {s.label}</span>
                    {isPassed && <Check className="w-3 h-3 text-emerald-400" />}
                  </div>
                  <p className="text-[9px] text-slate-400 truncate hidden md:block">{s.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Celebration Modal Animation */}
      {celebration && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase font-bold text-amber-400 tracking-wider">🎉 Nasazení úspěšné!</span>
              <h3 className="text-2xl font-black text-white mt-1">Stavební systém je aktivní!</h3>
              <p className="text-xs text-slate-400 mt-2">
                Konfigurace společnosti <strong className="text-amber-400">{companyName}</strong> byla úspěšně zavedena. Přesměrováváme do nového přehledu...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step Content Container */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-8 space-y-6">
        {/* Step 1: Company Name & Website */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 1: Základní údaje o stavební firmě</h3>
              <p className="text-xs text-slate-400">Zadejte oficiální název a URL webu, ze kterého systém načte data.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Název společnosti</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-100 focus:border-amber-500 focus:outline-none"
                  placeholder="např. Střechy & Pergoly Novák s.r.o."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Webové stránky (URL)</label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                    placeholder="https://vasedomena.cz"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Automatická synchronizace načte portfolio, služby a kontakt z firemního webu.
              </span>
              <span className="font-bold text-amber-400 font-mono">100% Připraveno</span>
            </div>
          </div>
        )}

        {/* Step 2: Upload Logo */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 2: Logo společnosti</h3>
              <p className="text-xs text-slate-400">Nahrajte vektorové SVG nebo PNG logo pro hlavičku nabídek a klientského portálu.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
              <div className="w-32 h-32 rounded-2xl bg-slate-900 border border-slate-800 p-2 shadow-xs flex items-center justify-center overflow-hidden">
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div className="space-y-2 text-center sm:text-left flex-1">
                <h4 className="text-sm font-bold text-slate-200">Aktuální náhled loga</h4>
                <p className="text-xs text-slate-400">Podporované formáty: SVG, PNG, WebP (min. 400x400 px s průhledným pozadím)</p>
                <div className="flex gap-2 justify-center sm:justify-start pt-2">
                  <button className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold hover:bg-amber-400 transition-all flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> Nahrát nové logo
                  </button>
                  <button 
                    onClick={() => setLogoPreview('https://images.unsplash.com/photo-1541888946425-d0fbb18f2445?auto=format&fit=crop&w=160&q=80')}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                  >
                    Vybrat vzorové
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Brand Colors */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 3: Firemní barvy</h3>
              <p className="text-xs text-slate-400">Barevná paleta byla přednastavena pro průmyslový vzhled. Můžete ji upravit.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Primární barva značky (Tlačítka & Akcenty)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Sekundární barva (Pozadí & Navigace)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-300 focus:outline-none focus:border-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview of Buttons */}
            <div className="p-6 rounded-2xl text-white space-y-3 bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Živý náhled barevného schématu</span>
              <div className="flex items-center gap-3">
                <button 
                  className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all"
                >
                  Primární tlačítko nabídky
                </button>
                <span className="text-xs font-mono text-slate-400">V souladu s WCAG kontrastem</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Employees Import */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Krok 4: Import zaměstnanců & řemeslníků</h3>
                <p className="text-xs text-slate-400">Zadejte své montážníky a techniky nebo importujte CSV soubor.</p>
              </div>
              <button className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nahrát CSV</span>
              </button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {employeesList.map((emp, idx) => (
                <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-100">{emp.name}</span>
                    <span className="text-slate-400 ml-2">({emp.role})</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{emp.phone} • Specializace: {emp.skills}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-full font-bold text-[10px]">
                    Aktivní v terénu
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddEmployee} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                placeholder="Jméno a příjmení technika..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={newEmpRole}
                onChange={(e) => setNewEmpRole(e.target.value)}
                placeholder="Pozice (např. Tesař)"
                className="w-48 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all"
              >
                + Přidat
              </button>
            </form>
          </div>
        )}

        {/* Step 5: Service Area */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 5: Akční rádius a lokalita působení</h3>
              <p className="text-xs text-slate-400">Nastavte dojezdovou vzdálenost pro automatické filtrování poptávek.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Centrum působnosti</label>
                <input
                  type="text"
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Maximální rádius dojezdu: {serviceRadius} km</label>
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(Number(e.target.value))}
                  className="w-full mt-3 accent-amber-500"
                />
              </div>
            </div>

            {/* Map visualizer box */}
            <div className="p-6 bg-slate-950 text-white rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Oblast pokrytí: {serviceRadius} km kolem {serviceCenter}</h4>
                  <p className="text-xs text-slate-400">Poptávky mimo tento rádius budou automaticky označeny s příplatkem za dopravu.</p>
                </div>
              </div>
              <span className="text-xs font-mono bg-amber-500 text-slate-950 px-3 py-1 rounded-full font-bold">Aktivní filtr</span>
            </div>
          </div>
        )}

        {/* Step 6: Connect Gmail / Outlook */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 6: Propojení firemního e-mailu (Gmail / Outlook)</h3>
              <p className="text-xs text-slate-400">Příchozí e-maily od poptávajících klientů budou automaticky převáděny na zakázky v CRM.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => setEmailProvider('gmail')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  emailProvider === 'gmail' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm text-slate-100">Google Workspace / Gmail</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">Doporučeno</span>
                </div>
                <p className="text-xs text-slate-400">Okamžitá synchronizace kalendáře montáží a odesílání cenových nabídek.</p>
              </div>

              <div 
                onClick={() => setEmailProvider('outlook')}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  emailProvider === 'outlook' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm text-slate-100">Microsoft 365 / Outlook</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">MS Exchange</span>
                </div>
                <p className="text-xs text-slate-400">Podpora firemních serverů a sdílených mailboxů.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-emerald-800/80 rounded-2xl flex items-center justify-between text-xs text-emerald-400">
              <div className="flex items-center gap-2 font-semibold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Připojeno k účtu: {emailAddress}</span>
              </div>
              <span className="text-xs font-mono text-emerald-400">OAuth 2.0 Zabezpečeno</span>
            </div>
          </div>
        )}

        {/* Step 7: Generate Lead Widget Code */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">Krok 7: Vygenerovaný instalační kód widgetu</h3>
              <p className="text-xs text-slate-400">
                Vložte tento 1 řádek kódu do hlavičky vašeho webu (WordPress, Shoptet, Webflow nebo čisté HTML).
              </p>
            </div>

            {/* Code Block */}
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 relative font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 pb-3 border-b border-slate-800 mb-3">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">1-Line Embed Code</span>
                <button
                  onClick={handleCopySnippet}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-[11px] font-bold flex items-center gap-1.5 transition-all"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Zkopírováno!' : 'Zkopírovat kód'}</span>
                </button>
              </div>

              <code className="text-amber-300 break-all leading-relaxed block">
                {widgetSnippet}
              </code>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-100 block mb-0.5">⚡ Lehký & Bleskový</span>
                <p className="text-[11px]">Velikost pouhých 18 kB, nezatěžuje rychlost načítání webu.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-100 block mb-0.5">🎨 Vlastní design</span>
                <p className="text-[11px]">Přizpůsobí se barvám {primaryColor} i fontu vaší domény.</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-100 block mb-0.5">🤖 Okamžitá kalkulace</span>
                <p className="text-[11px]">Odhadne rozpočet a technikovi předá hotové zaměření.</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Deploy Button */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 font-bold text-xs hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zpět</span>
          </button>

          {currentStep < 7 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
            >
              <span>Pokračovat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleDeployOS}
              disabled={isDeploying}
              className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl flex items-center gap-2 active:scale-95 animate-pulse"
            >
              <Rocket className="w-5 h-5" />
              <span>{isDeploying ? 'Nasazuji konfiguraci systému...' : 'Aktivovat systém pro firmu'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
