import React, { useState } from 'react';
import { Building2, ExternalLink, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { Link, useRouter } from '../app/router';
import { resolveDemoUrl } from '../app/demoUrl';

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

  return <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans">
    {menuOpen && <button aria-label="Zavřít menu" className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-36px)] flex-col border-r border-slate-800 bg-[#0C111D] transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between border-b border-slate-800 p-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300"><ShieldCheck className="h-5 w-5" /></span><div><strong className="block text-sm text-white">StavbaFlow</strong><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300">Správa platformy</span></div></div>
        <button aria-label="Zavřít menu" className="text-slate-400 lg:hidden" onClick={() => setMenuOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map(({ label, path, icon: Icon, exact }) => <Link key={path} to={path} exact={exact} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${isActive(path, exact) ? 'border border-blue-500/30 bg-blue-500/15 text-blue-200' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}><Icon className="h-4 w-4" />{label}</Link>)}
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-amber-100">Přístup k zákaznickým datům není automatický. Auditovaná podpora je vázaná na váš účet, konkrétní firmu a vyprší nejpozději za 30 minut.</div>
      </nav>
      <div className="border-t border-slate-800 p-4"><p className="truncate text-xs font-semibold text-white">{dbUser?.email || user?.email || 'Správce platformy'}</p><p className="mt-1 text-[10px] text-slate-500">Ověřeno serverovým registrem</p><button onClick={() => logout().then(() => navigate('/login'))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:border-rose-400/40 hover:text-rose-300"><LogOut className="h-4 w-4" />Odhlásit se</button></div>
    </aside>
    <section className="min-h-screen lg:ml-72">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-slate-800 bg-[#0C111D]/90 px-4 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button aria-label="Otevřít menu" className="text-slate-400 lg:hidden" onClick={() => setMenuOpen(true)}><Menu className="h-5 w-5" /></button><span className="text-xs font-semibold text-slate-400">Control plane</span><span className="text-xs text-blue-300">{pathname}</span></div>{ADMIN_DEMO.url ? <a href={ADMIN_DEMO.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">Skutečné demo <ExternalLink className="h-3.5 w-3.5" /></a> : <span title={ADMIN_DEMO.error || ''} className="cursor-not-allowed rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-600">Demo není nastavené</span>}</header>
      <main className="mx-auto w-full max-w-7xl p-4 sm:p-8">{children}</main>
    </section>
  </div>;
};
