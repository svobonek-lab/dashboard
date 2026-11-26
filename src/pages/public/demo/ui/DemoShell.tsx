import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Kanban, Sparkles, HardHat, Users, Code2, Zap, Lock, Menu, X, RotateCcw, type LucideIcon } from 'lucide-react';
import { useOrganization } from '@/entities/session';
import { useRouter } from '@/shared/lib/router';

interface DemoShellProps {
  children: React.ReactNode;
  exitLink: { href: string; label: string };
  onReset: () => void;
}

// Same order and wording as the owner navigation of the real pilot.
const ENABLED_ITEMS: Array<{ label: string; path: string; icon: LucideIcon; exact?: boolean }> = [
  { label: 'Přehled', path: '/demo', icon: LayoutDashboard, exact: true },
  { label: 'Poptávky', path: '/demo/leads', icon: Kanban },
];

// Pilot screens that exist in the product but are not part of the public demo.
const OUTSIDE_DEMO_ITEMS: Array<{ label: string; icon: LucideIcon }> = [
  { label: 'Poptávkový formulář', icon: Sparkles },
  { label: 'Zakázky v realizaci', icon: HardHat },
  { label: 'Tým', icon: Users },
  { label: 'Formulář pro web', icon: Code2 },
  { label: 'Integrace', icon: Zap },
];

export const DemoShell: React.FC<DemoShellProps> = ({ children, exitLink, onReset }) => {
  const { currentOrg, dbUser } = useOrganization();
  const { navigate, isActive } = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const companyName = currentOrg?.name || 'Ukázková firma';

  useEffect(() => {
    if (!isDrawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsDrawerOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isDrawerOpen]);

  return (
    <div className="workspace-shell sf-owner-shell min-h-screen bg-surface-secondary text-text flex flex-col font-sans selection:bg-brand-primary-soft">
      <div className="flex flex-1">
        {isDrawerOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          id="demo-navigation"
          aria-label="Navigace dema"
          className={`workspace-rail w-64 max-w-[calc(100vw-36px)] lg:max-w-none lg:w-64 bg-surface border-r border-border flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 shadow-app transition-transform duration-300 ease-out font-sans ${
            isDrawerOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible lg:translate-x-0'
          }`}
        >
          <div>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-[36px] h-[36px] rounded-app bg-brand-primary text-white font-black text-sm shrink-0 flex items-center justify-center shadow-app overflow-hidden">
                  {companyName.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h1 className="text-[17px] font-bold text-text truncate tracking-tight leading-tight">{companyName}</h1>
                  <p className="text-[10px] font-semibold text-muted mt-0.5">Firemní účet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="lg:hidden p-2 rounded-lg text-muted hover:text-text hover:bg-surface-secondary min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Zavřít menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav aria-label="Hlavní navigace dema" className="py-4 px-0 space-y-0.5 overflow-y-auto max-h-[calc(100vh-250px)]">
              <div className="px-6 pb-2 text-[10px] font-bold text-muted">Aplikace</div>

              {ENABLED_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <button
                    key={item.path}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => { setIsDrawerOpen(false); navigate(item.path); }}
                    className={`w-full min-h-[44px] flex items-center px-6 py-2.5 text-sm font-semibold transition-colors relative cursor-pointer text-left ${
                      active ? 'bg-brand-primary-soft/40 text-brand-primary font-bold' : 'text-muted hover:text-text hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-primary rounded-r-xs" />}
                      <Icon className={`w-4 h-4 ${active ? 'text-brand-primary' : 'text-muted'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}

              {OUTSIDE_DEMO_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    aria-disabled="true"
                    title="Tato část je v produktu, ale ne ve veřejném demu."
                    className="w-full min-h-[44px] flex items-center justify-between px-6 py-2.5 text-sm font-semibold text-muted/60 cursor-not-allowed select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 text-muted/60 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-muted/60 shrink-0" aria-hidden="true" />
                    <span className="sr-only">(mimo demo)</span>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-border bg-surface-secondary flex flex-col gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-app bg-brand-primary text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-app">
                {(dbUser?.name || 'D').charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-text truncate">{dbUser?.name || 'Demo majitel'}</p>
                <p className="text-[9px] font-semibold text-muted">Majitel</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
              <button
                type="button"
                onClick={() => { setIsDrawerOpen(false); onReset(); }}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-app text-xs font-semibold text-muted hover:text-text hover:bg-surface-tertiary transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Obnovit ukázková data</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 lg:ml-64 w-full min-w-0 flex flex-col min-h-screen bg-surface-secondary relative overflow-x-hidden">
          <header className="workspace-panel !rounded-none !border-x-0 !border-t-0 h-16 bg-surface border-b border-border px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 text-text">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                ref={menuButtonRef}
                type="button"
                aria-expanded={isDrawerOpen}
                aria-controls="demo-navigation"
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl border border-border bg-surface flex items-center justify-center text-muted hover:text-text hover:bg-surface-secondary shrink-0"
                aria-label="Otevřít menu navigace"
              >
                <Menu className="w-5 h-5" />
              </button>
              <a href="/" className="text-sm sm:text-base font-bold tracking-tight text-text truncate">StavbaFlow demo</a>
              <span className="hidden sm:inline-block text-[11px] text-muted font-medium bg-surface-secondary px-2.5 py-1 rounded-full border border-border shrink-0">Firemní přehled</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={exitLink.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">{exitLink.label}</a>
              <a href="/login" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Přihlásit se</a>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
};
