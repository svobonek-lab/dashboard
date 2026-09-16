import React from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { useRouter } from '../src/app/router';
import { ImagePlus, Users, MessageSquarePlus, Code, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export const OnboardingChecklist: React.FC<{ leadsCount: number; employeesCount: number }> = ({ leadsCount, employeesCount }) => {
  const { currentOrg } = useOrganization();
  const { navigate } = useRouter();

  const hasLogo = !!(currentOrg?.logo_url && currentOrg.logo_url.trim() !== '' && !currentOrg.logo_url.includes('unsplash.com'));
  const hasEmployees = employeesCount > 0;
  const hasLeads = leadsCount > 0;

  const steps = [
    {
      id: 'logo',
      title: 'Přidat logo',
      description: 'Nahrajte firemní logo a přizpůsobte CRM své značce.',
      icon: ImagePlus,
      completed: !!hasLogo,
      action: () => navigate('/settings'),
      cta: 'Přejít do nastavení'
    },
    {
      id: 'employee',
      title: 'Pozvat zaměstnance',
      description: 'Přidejte své montážníky, techniky nebo obchodníky.',
      icon: Users,
      completed: hasEmployees,
      action: () => navigate('/employees'),
      cta: 'Správa týmu'
    },
    {
      id: 'lead',
      title: 'Přidat první poptávku',
      description: 'Zadejte poptávku a vyzkoušejte si průchod procesem.',
      icon: MessageSquarePlus,
      completed: hasLeads,
      action: () => navigate('/leads'),
      cta: 'Přejít na zakázky'
    },
    {
      id: 'widget',
      title: 'Vložit widget',
      description: 'Získejte poptávky z vašeho webu přímo do CRM.',
      icon: Code,
      completed: false, // Hard to detect automatically without telemetry, keep manual
      action: () => navigate('/widget'),
      cta: 'Získat kód formuláře'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-8 px-4 sm:px-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Vítejte v novém firemním prostoru</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Váš firemní profil {currentOrg?.name} je připraven. Než se naplno pustíte do práce, doporučujeme projít tyto základní kroky pro nastavení vašeho účtu.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
          <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Startovací checklist</h2>
            <p className="text-sm text-slate-500 mt-1">Dokončeno {completedCount} ze {steps.length} úkolů</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 font-bold text-slate-400">
            {completedCount}/{steps.length}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map(step => (
            <div 
              key={step.id}
              onClick={step.action}
              className={`group p-6 rounded-2xl border transition-all cursor-pointer ${
                step.completed 
                  ? 'bg-slate-50 border-slate-200 opacity-70' 
                  : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 shrink-0 ${step.completed ? 'text-emerald-500' : 'text-slate-300'}`}>
                  {step.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <h3 className={`font-bold ${step.completed ? 'text-slate-600 line-through decoration-slate-300' : 'text-slate-900'}`}>{step.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{step.description}</p>
                  </div>
                  {!step.completed && (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-x-2 group-hover:translate-x-0 duration-300">
                      <span>{step.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
