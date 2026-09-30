import React, { useState } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useRouter } from '../src/app/router';
import { readTenantCache, writeTenantCache, TENANT_CACHE_NAMES } from '../src/app/tenantCache';
import { 
  Building2, 
  Users, 
  MessageSquarePlus, 
  Code, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  FileText,
  Mail,
  Smartphone,
  DollarSign,
  FileSpreadsheet,
  Sparkles,
  Check
} from 'lucide-react';

export const OnboardingChecklist: React.FC<{ leadsCount: number; employeesCount: number }> = ({ leadsCount, employeesCount }) => {
  const { currentOrg } = useOrganization();
  const { navigate } = useRouter();

  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>(() => {
    try {
      return readTenantCache<Record<string, boolean>>(TENANT_CACHE_NAMES.onboarding, currentOrg?.id) || {};
    } catch {
      return {};
    }
  });

  const toggleManualCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setManualChecks(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      writeTenantCache(TENANT_CACHE_NAMES.onboarding, updated, currentOrg?.id);
      return updated;
    });
  };

  const hasLogo = !!(currentOrg?.logo_url && currentOrg.logo_url.trim() !== '' && !currentOrg.logo_url.includes('unsplash.com'));
  const hasEmployees = employeesCount >= 2;
  const hasLeads = leadsCount > 0;

  // 9 Concrete Operational Phases from Page 16 of Audit
  const steps = [
    {
      id: 'firma',
      phase: 'Firma',
      title: 'Firemní identita a IČO',
      description: 'Nastavte logo, IČO, fakturační údaje a razítko/podpis pro nabídky.',
      icon: Building2,
      completed: !!hasLogo || !!manualChecks['firma'],
      action: () => navigate('/settings'),
      cta: 'Nastavit firmu'
    },
    {
      id: 'obchod',
      phase: 'Obchod',
      title: 'Import kontaktů / První lead',
      description: 'Zadejte první poptávku ručně nebo naimportujte stávající zákazníky.',
      icon: MessageSquarePlus,
      completed: hasLeads || !!manualChecks['obchod'],
      action: () => navigate('/leads'),
      cta: 'Správa poptávek'
    },
    {
      id: 'formular',
      phase: 'Formulář',
      title: 'Webový formulář / iframe',
      description: 'Nasaďte poptávkový widget na váš web pro automatické přijímání leadů.',
      icon: Code,
      completed: !!manualChecks['formular'],
      action: () => navigate('/widget'),
      cta: 'Získat kód formuláře'
    },
    {
      id: 'nabidka',
      phase: 'Nabídka',
      title: 'Šablona nabídky a DPH',
      description: 'Ověřte položkový ceník, sazbu DPH 21 % a obchodní podmínky.',
      icon: FileText,
      completed: !!manualChecks['nabidka'],
      action: () => navigate('/quotes'),
      cta: 'Tvorba nabídek'
    },
    {
      id: 'tym',
      phase: 'Tým',
      title: 'Tým (min. 2 lidé)',
      description: 'Pozvěte mistry, rozpočtáře nebo montážní partu do systému.',
      icon: Users,
      completed: hasEmployees || !!manualChecks['tym'],
      action: () => navigate('/employees'),
      cta: 'Pozvat kolegy'
    },
    {
      id: 'email',
      phase: 'E-mail',
      title: 'Odeslání testovacího e-mailu',
      description: 'Ověřte notifikace z outboxu a šablony zpráv pro investory.',
      icon: Mail,
      completed: !!manualChecks['email'],
      action: () => navigate('/communication'),
      cta: 'Komunikační centrum'
    },
    {
      id: 'mobil',
      phase: 'Mobil',
      title: 'Terénní výkaz (čas a foto)',
      description: 'Vyzkoušejte mobilní rozhraní pro start práce a fotodokumentaci ze stavby.',
      icon: Smartphone,
      completed: !!manualChecks['mobil'],
      action: () => navigate('/leads'),
      cta: 'Správa zakázek'
    },
    {
      id: 'finance',
      phase: 'Finance',
      title: 'První reálný náklad a marže',
      description: 'Zaevidujte nákup materiálu a zkontrolujte propočet plánované vs. skutečné marže.',
      icon: DollarSign,
      completed: !!manualChecks['finance'],
      action: () => navigate('/leads'),
      cta: 'Zadat náklad'
    },
    {
      id: 'pohoda',
      phase: 'POHODA',
      title: 'Testovací XML export',
      description: 'Stáhněte vzorový Stormware dataPack kontaktů a faktur pro vaši účtárnu.',
      icon: FileSpreadsheet,
      completed: !!manualChecks['pohoda'],
      action: () => navigate('/integrations'),
      cta: 'POHODA export'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-8 px-4 sm:px-6 pb-20">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>První „aha moment“ do 1 pracovního dne</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Startovací proces: {currentOrg?.name || 'StavbaCore'}
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto font-medium">
          Cílem onboardingu není pouhé založení účtu. Onboarding je dokončen, jakmile vaše firma <strong>zpracuje první skutečnou poptávku od přijetí po další krok</strong>.
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 overflow-hidden relative space-y-6">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
          <div className="h-full bg-[#0A84FF] transition-all duration-700" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">9 fází zprovoznění systému</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dokončeno <strong>{completedCount} z {steps.length}</strong> kroků ({progress} %)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-[#0A84FF] font-black text-sm font-mono">
              {progress} % HOTOVO
            </div>
          </div>
        </div>

        {/* 9 Grid Phases */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.id}
                onClick={step.action}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  step.completed 
                    ? 'bg-slate-50/80 border-slate-200/80' 
                    : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${step.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {step.phase}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => toggleManualCheck(step.id, e)}
                      className={`p-1.5 rounded-lg transition-colors ${step.completed ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`}
                      title={step.completed ? 'Označit jako nedokončené' : 'Označit jako hotové'}
                    >
                      {step.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>
                  </div>

                  <div>
                    <h3 className={`text-xs font-black ${step.completed ? 'text-slate-600 line-through decoration-slate-300' : 'text-slate-900'}`}>
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>{step.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900 font-medium">
          <div>
            <strong>Potřebujete pomoci se zavedením?</strong> V rámci Founding Pilotu projdeme nastavení osobně za 20 minut.
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 bg-[#0A84FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            Přejít do nastavení firmy
          </button>
        </div>

      </div>
    </div>
  );
};

