import React from 'react';
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
  RefreshCw
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
    <div className="min-h-screen bg-[#090D16] text-slate-900 flex font-sans selection:bg-cyan-500/30">
      
      {/* Super Admin Enterprise Dark Sidebar */}
      <aside className="w-72 bg-[#0C111D] border-r border-slate-200/80 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30">
        
        {/* Brand Header */}
        <div>
          <div className="p-6 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full bg-[#0C111D] rounded-[10px] flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-slate-900 tracking-tight">STAVBACORE</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Multi-Tenant Control Plane
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
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
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${active ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-700'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Platform Telemetry & User */}
        <div className="p-4 border-t border-slate-200/80 space-y-4">
          
          {/* Quick Telemetry Box */}
          <div className="p-3 bg-[#090D16] border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                Cluster Node
              </span>
              <span className="text-green-400 font-bold">online (99.99%)</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500 flex items-center gap-1">
                <Server className="w-3 h-3 text-cyan-400" />
                Database RTT
              </span>
              <span className="text-slate-700 font-semibold">24 ms (Supabase)</span>
            </div>
          </div>

          {/* Super Admin User Profile */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-black text-xs shrink-0">
                SA
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{dbUser?.email || user?.email || 'admin@stavbacore.cz'}</p>
                <p className="text-[10px] text-cyan-400 font-mono">System Architect</p>
              </div>
            </div>

            <button
              onClick={() => logout().then(() => navigate('/login'))}
              title="Odhlásit se"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </aside>

      {/* Main Super Admin Content Canvas */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        
        {/* Impersonation Floating Banner if active */}
        {impersonatingOrgId && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 px-6 py-3 flex items-center justify-between text-xs font-mono font-bold backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                Impersonation Active
              </span>
              <span>Aktuálně emulujete pohled pro firmu: <strong className="text-slate-900 underline">{currentOrg?.name}</strong> ({currentOrg?.id})</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1 rounded-lg bg-white border border-amber-500/40 text-amber-400 hover:bg-slate-800 text-[11px] font-bold flex items-center gap-1"
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
        <header className="h-16 bg-[#0C111D]/80 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-slate-700 font-bold">SUPERADMIN OS</span>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-400 font-semibold">{pathname}</span>
            </div>

            <div className="h-5 w-px bg-slate-800"></div>

            {/* Top Bar Multi-Tenant Company Switcher */}
            <CompanySwitcher variant="dark" />
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden md:flex items-center gap-4 px-3.5 py-1.5 rounded-xl bg-[#090D16] border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Activity className="w-3.5 h-3.5 text-green-400" />
                <span>API Latency:</span>
                <span className="font-bold text-slate-800">18ms</span>
              </div>
              <div className="h-3 w-px bg-slate-800"></div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>SLA:</span>
                <span className="font-bold text-green-400">99.98%</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/install')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Nová instalace klienta</span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

    </div>
  );
};
