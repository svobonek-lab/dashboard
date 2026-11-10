import React, { useState } from 'react';
import { Building2, ExternalLink, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useOrganization } from '@/entities/session';
import { Link, useRouter } from '@/shared/lib/router';
import { resolveDemoUrl } from '@/shared/lib/demoUrl';

const ADMIN_DEMO = resolveDemoUrl(((import.meta as any).env || {}) as Record<string, unknown>, {
  isDevelopment: Boolean((import.meta as any).env?.DEV),
  origin: typeof window === 'undefined' ? '' : window.location.origin,
  allowRelative: true,
});

export const SuperAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, dbUser, logout } = useOrganization();
  const { pathname, navigate, isActive } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = [
    { label: 'Přehled platformy', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Zákaznické firmy', path: '/admin/companies', icon: Building2 },
  ];

  return <div className="workspace-shell min-h-screen bg-surface-secondary text-text font-sans">
    {menuOpen && <button aria-label="Zavřít menu" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <aside className={`workspace-rail fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-36px)] flex-col border-r border-border bg-surface transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between border-b border-border p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary-soft text-brand-primary"><ShieldCheck className="h-5 w-5" /></span><div><strong className="block text-sm text-text">StavbaFlow</strong><span className="text-xs font-semibold text-muted">Správa platformy</span></div></div>
        <button aria-label="Zavřít menu" className="text-muted lg:hidden" onClick={() => setMenuOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ label, path, icon: Icon, exact }) => <Link key={path} to={path} exact={exact} onClick={() => setMenuOpen(false)} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive(path, exact) ? 'bg-brand-primary-soft text-blue-800' : 'text-muted hover:bg-surface-secondary hover:text-text'}`}><Icon className="h-4 w-4" />{label}</Link>)}
        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-5 text-amber-950">Přístup k zákaznickým datům není automatický. Auditovaná podpora je vázaná na váš účet, konkrétní firmu a vyprší nejpozději za 30 minut.</div>
      </nav>
      <div className="border-t border-border p-4"><p className="truncate text-sm font-semibold text-text">{dbUser?.email || user?.email || 'Správce platformy'}</p><p className="mt-1 text-xs text-muted">Ověřeno serverovým registrem</p><button onClick={() => logout().then(() => navigate('/login'))} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted hover:border-rose-300 hover:text-rose-700"><LogOut className="h-4 w-4" />Odhlásit se</button></div>
    </aside>
    <section className="min-h-screen lg:ml-72">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button aria-label="Otevřít menu" className="text-muted lg:hidden" onClick={() => setMenuOpen(true)}><Menu className="h-5 w-5" /></button><span className="hidden text-sm font-semibold text-muted sm:inline">Správa platformy</span><span className="max-w-[160px] truncate text-sm font-medium text-text sm:max-w-none">{pathname === '/admin' ? 'Přehled' : 'Zákaznické firmy'}</span></div>{ADMIN_DEMO.url ? <a href={ADMIN_DEMO.url} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-secondary hover:text-text">Otevřít demo <ExternalLink className="h-3.5 w-3.5" /></a> : <span title={ADMIN_DEMO.error || ''} className="cursor-not-allowed rounded-lg border border-border px-3 py-2 text-sm text-muted">Demo není nastavené</span>}</header>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-8">{children}</main>
    </section>
  </div>;
};
