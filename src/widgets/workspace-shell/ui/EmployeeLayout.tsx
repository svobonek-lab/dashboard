import React from 'react';
import { BriefcaseBusiness, Camera, LayoutDashboard, LogOut } from 'lucide-react';
import { useOrganization } from '@/entities/session';
import { useRouter } from '@/shared/lib/router';
import type { Lead } from '@/entities/lead';
import { CompanyIdentity } from '../../../entities/company';

interface EmployeeLayoutProps {
  children: React.ReactNode;
  leads?: Lead[];
}

export const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({ children, leads = [] }) => {
  const { currentOrg, dbUser, logout } = useOrganization();
  const { navigate, pathname } = useRouter();
  const navItems = [
    { href: '/employee', label: 'Přehled', icon: LayoutDashboard },
    { href: '/employee/jobs', label: 'Zakázky', icon: BriefcaseBusiness },
    { href: '/employee/photos', label: 'Fotky', icon: Camera },
  ];

  return (
    <div className="workspace-shell min-h-screen bg-surface-secondary text-text">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><CompanyIdentity name={currentOrg?.name || 'StavbaFlow'} logoUrl={currentOrg?.logo_url} primaryColor="#2563eb" subtitle={dbUser?.email || 'Pracovní účet'} /></div>
          <button type="button" onClick={() => logout().then(() => navigate('/login'))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-950"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Odhlásit</span></button>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white" aria-label="Pracovní navigace"><div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">{navItems.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href === '/employee' && pathname === '/employee/dashboard'); return <button key={item.href} type="button" onClick={() => navigate(item.href)} className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</div></nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 ">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><BriefcaseBusiness className="h-4 w-4 text-blue-600" /> Moje přiřazené zakázky</span>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{leads.length}</span>
        </div>
        {children}
      </main>
    </div>
  );
};
