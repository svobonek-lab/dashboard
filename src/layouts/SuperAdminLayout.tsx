import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useRouter, Link } from '../app/router';
import { CompanySwitcher } from '@/components/CompanySwitcher';
import { 
  ShieldCheck, 
  Building2, 
  Wand2, 
  Sparkles, 
  Globe2, 
  CreditCard, 
  Terminal, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Server,
  Activity,
  Zap,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  CheckCircle2,
  RefreshCw,
  Menu,
  X
} from 'lucide-react';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children }) => {
  const { 
    user, 
    dbUser, 
    logout, 
    impersonatingOrgId, 
    currentOrg, 
    stopImpersonation 
  } = useOrganization();
  const { pathname, navigate, isActive } = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'System Overview', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Companies Directory', path: '/admin/companies', icon: Building2 },
    { label: 'Install Studio 2.0', path: '/admin/install', icon: Wand2, badge: 'New' },
    { label: 'AI Demo Creator', path: '/admin/demo-creator', icon: Sparkles },
    { label: 'Custom Domains', path: '/admin/domains', icon: Globe2 },
    { label: 'Billing & MRR', path: '/admin/billing', icon: CreditCard },
    { label: 'Audit & Telemetry Logs', path: '/admin/logs', icon: Terminal },
    { label: 'Platform Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex font-sans selection:bg-blue-500/30">
      
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden transition-opacity cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Super Admin Enterprise Dark Sidebar (Drawer on mobile, fixed from lg) */}
      <aside className={`w-72 max-w-[calc(100vw-36px)] lg:max-w-none lg:w-72 bg-[#0C111D] border-r border-slate-800 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out h-dvh overflow-y-auto ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Top Brand Header */}
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-0.5 shadow-lg shadow-blue-500/20">
                <div className="w-full h-full bg-[#0C111D] rounded-[10px] flex items-center justify-center text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-white tracking-tight">STAVBACORE</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Multi-Tenant Control Plane
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              aria-label="Zavřít menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Infrastructure & Tenants
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  exact={item.exact}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    active
                      ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-sm shadow-blue-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Sales & Presentation Section for Super Admin */}
            <div className="pt-4 px-3 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Prodej
            </div>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-blue-300 hover:bg-slate-800/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Globe2 className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                <span>Landing page</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            </a>
            <a
              href="/demo"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-blue-300 hover:bg-slate-800/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                <span>Interaktivní demo</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
            </a>
          </nav>
        </div>

        {/* Bottom Platform Telemetry & User (mt-auto to ensure scrollability on small screens) */}
        <div className="mt-auto p-4 border-t border-slate-800 space-y-4 shrink-0">
          
          {/* Quick Telemetry Box */}
          <div className="p-3 bg-[#090D16] border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-blue-400" />
                Cluster Node
              </span>
              <span className="text-green-400 font-bold">online (99.99%)</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Server className="w-3 h-3 text-blue-400" />
                Database RTT
              </span>
              <span className="text-slate-300 font-semibold">24 ms (Supabase)</span>
            </div>
          </div>

          {/* Super Admin User Profile */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 flex items-center justify-center font-black text-xs shrink-0">
                SA
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{dbUser?.email || user?.email || 'admin@stavbacore.cz'}</p>
                <p className="text-[10px] text-blue-400 font-mono">System Architect</p>
              </div>
            </div>

            <button
              onClick={() => logout().then(() => navigate('/login'))}
              title="Odhlásit se"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </aside>

      {/* Main Super Admin Content Canvas */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:ml-72">
        
        {/* Impersonation Floating Banner if active */}
        {impersonatingOrgId && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono font-bold backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                Impersonation Active
              </span>
              <span>Aktuálně emulujete pohled pro firmu: <strong className="text-white underline">{currentOrg?.name}</strong> ({currentOrg?.id})</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-400 hover:bg-slate-800 text-[11px] font-bold flex items-center gap-1"
              >
                <span>Otevřít Owner Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => stopImpersonation()}
                className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 text-[11px] font-black"
              >
                Ukončit impersonaci ✕
              </button>
            </div>
          </div>
        )}

        {/* Enterprise Top Header Bar */}
        <header className="min-h-16 h-auto py-2.5 bg-[#0C111D]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Otevřít menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              <span className="text-slate-300 font-bold hidden sm:inline">SUPERADMIN OS</span>
              <span className="text-slate-500 hidden sm:inline">/</span>
              <span className="text-blue-400 font-semibold truncate max-w-[140px] sm:max-w-none">{pathname}</span>
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block"></div>

            {/* Top Bar Multi-Tenant Company Switcher */}
            <CompanySwitcher variant="dark" />
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono">
            <div className="hidden xl:flex items-center gap-4 px-3.5 py-1.5 rounded-xl bg-[#090D16] border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Activity className="w-3.5 h-3.5 text-green-400" />
                <span>API Latency:</span>
                <span className="font-bold text-slate-200">18ms</span>
              </div>
              <div className="h-3 w-px bg-slate-800"></div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>SLA:</span>
                <span className="font-bold text-green-400">99.98%</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/install')}
              className="px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 shrink-0"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Nová instalace</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

    </div>
  );
};
