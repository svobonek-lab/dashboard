import React from 'react';
import { Building2, Check, MessageSquarePlus, UserPlus, UsersRound } from 'lucide-react';

export const OnboardingChecklist: React.FC<{ leadsCount: number; employeesCount: number; organizationName: string; hasIdentity: boolean; onNavigate: (href: string) => void }> = ({ leadsCount, employeesCount, organizationName, hasIdentity, onNavigate }) => {
  const steps = [
    { title: 'Doplňte profil firmy', description: 'Kontaktní údaje a identita, které zákazník uvidí.', href: '/settings', complete: hasIdentity, icon: Building2 },
    { title: 'Založte první poptávku', description: 'Zapište zákazníka, kontakt a požadovanou práci.', href: '/leads', complete: leadsCount > 0, icon: MessageSquarePlus },
    { title: 'Pozvěte zaměstnance', description: 'Každý člen týmu dostane vlastní bezpečný přístup.', href: '/employees', complete: employeesCount > 0, icon: UserPlus },
    { title: 'Přiřaďte zakázku', description: 'Zaměstnanec potom uvidí pouze svou přidělenou práci.', href: '/leads', complete: false, icon: UsersRound },
  ];
  const completed = steps.filter((step) => step.complete).length;

  return (
    <div className="workspace-page mx-auto max-w-5xl pt-4">
      <header className="workspace-page-header">
        <div>
          <p className="workspace-kicker">Začínáme s {organizationName || 'vaší firmou'}</p>
          <h1 className="workspace-title">4 kroky k první zakázce</h1>
          <p className="workspace-subtitle">Nastavte jen to, co potřebujete pro příjem poptávky, rozdělení práce a první uloženou změnu stavu.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><strong className="block text-xl font-semibold text-slate-950">{completed}/4</strong><span className="text-xs text-slate-500">hotové kroky</span></div>
      </header>

      <section className="workspace-panel overflow-hidden">
        <div className="h-1 bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${completed * 25}%` }} /></div>
        <div className="divide-y divide-slate-100">
          {steps.map(({ title, description, href, complete, icon: Icon }, index) => (
            <button key={title} type="button" aria-label={`Otevřít krok ${title}`} onClick={() => onNavigate(href)} className="group flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-slate-50 sm:px-7">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-600'}`}>{complete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span>
              <span className="min-w-0 flex-1"><small className="text-xs font-semibold text-slate-400">Krok {index + 1}</small><strong className="mt-1 block text-sm font-semibold text-slate-950">{title}</strong><span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span></span>
              <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{complete ? 'Hotovo' : 'Pokračovat'}</span>

            </button>
          ))}
        </div>
      </section>

      <p className="px-2 text-center text-sm text-slate-500">Nastavením vás při pilotu provedeme osobně. Nic důležitého nemusíte řešit sami.</p>
    </div>
  );
};
