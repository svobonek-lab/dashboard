import React from 'react';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar as CalendarIcon, 
  Users, 
  FileText, 
  FolderOpen, 
  BarChart3, 
  Settings, 
  Sparkles,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Code2,
  Rocket,
  ShieldAlert,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { CompanyBranding } from '../types';
import { useOrganization } from '../context/OrganizationContext';
import { useBranding } from '../hooks/useBranding';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  branding?: CompanyBranding;
  onOpenDemoGenerator?: () => void;
  onOpenOnboarding?: () => void;
  onExportZip?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  onOpenDemoGenerator,
  onOpenOnboarding,
  onExportZip
}) => {
  const { currentOrg, dbUser, user, logout } = useOrganization();
  const { palette, branding } = useBranding();

  const activeCompanyName = currentOrg?.name || branding?.name || 'Stavební Firma';
  const primaryColor = currentOrg?.primary_color || palette.primary;

  const baseMenuItems = [
    { id: 'dashboard', label: 'Přehled stavby', icon: LayoutDashboard },
    { id: 'leads', label: 'Poptávky & Kanban', icon: Kanban },
    { id: 'calendar', label: 'Harmonogram výjezdů', icon: CalendarIcon },
    { id: 'employees', label: 'Tým & Řemeslníci', icon: Users },
    { id: 'quotes', label: 'Cenové nabídky & PDF', icon: FileText },
    { id: 'documents', label: 'Dokumenty & Protokoly', icon: FolderOpen },
    { id: 'analytics', label: 'Analytika & Marže', icon: BarChart3 },
    { id: 'communication', label: 'Komunikační centrum', icon: Phone },
    { id: 'widget', label: 'Embed Lead Widget', icon: Code2 },
    { id: 'portal', label: 'Klientský portál', icon: ShieldCheck },
    { id: 'settings', label: 'Nastavení systému', icon: Settings },
  ];

  const menuItems = [...baseMenuItems];
  if (dbUser?.email?.toLowerCase() === 'svobonek@gmail.com' && (dbUser?.role === 'super_admin' || dbUser?.role === 'superadmin')) {
    menuItems.unshift({ id: 'admin', label: 'Super Admin', icon: ShieldAlert });
  }

  return (
    <aside className="w-72 bg-white text-slate-800 flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-slate-200/80 shadow-xs font-sans">
      {/* Linear-style Top Brand Area */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs"
            style={{ backgroundColor: primaryColor }}
          >
            {activeCompanyName.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-[18px] font-black text-slate-900 truncate tracking-tight leading-none">
              {activeCompanyName}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                Workspace
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Linear-style Navigation Menu */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase font-mono">
          Hlavní menu
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                isActive 
                  ? 'bg-slate-100/90 text-slate-900 font-bold shadow-2xs border-l-2' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              style={isActive ? { borderLeftColor: primaryColor } : undefined}
            >
              <div className="flex items-center gap-3">
                <Icon 
                  className={`w-4 h-4 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400'}`} 
                  style={isActive ? { color: primaryColor } : undefined}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          );
        })}

        {onOpenDemoGenerator && (
          <div className="pt-4 border-t border-slate-100 mt-4 space-y-1">
            <button
              onClick={onOpenDemoGenerator}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-left"
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: primaryColor }} />
              <span>Generátor dema</span>
            </button>
          </div>
        )}
      </nav>

      {/* Linear-style Bottom Compact Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div 
            className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs"
            style={{ backgroundColor: primaryColor }}
          >
            {(dbUser?.email || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">
              {dbUser?.email || user?.email || 'Majitel CRM'}
            </p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {dbUser?.role || 'owner'}
            </p>
          </div>
        </div>

        <button
          onClick={() => logout().then(() => window.location.href = '/login')}
          title="Odhlásit se"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

