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
  Phone,
  ShieldCheck,
  Code2,
  ShieldAlert,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { useBranding } from '../hooks/useBranding';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenDemoGenerator?: () => void;
  onOpenOnboarding?: () => void;
  onExportZip?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  onOpenDemoGenerator
}) => {
  const { currentOrg, dbUser, user, logout } = useOrganization();
  const { palette, branding } = useBranding();

  const activeCompanyName = currentOrg?.name || branding?.name || 'Stavební Firma';

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
  ];

  const menuItems = [...baseMenuItems];
  if (dbUser?.email?.toLowerCase() === 'svobonek@gmail.com' && (dbUser?.role === 'super_admin' || dbUser?.role === 'superadmin')) {
    menuItems.unshift({ id: 'admin', label: 'Super Admin', icon: ShieldAlert });
  }

  const handleLogout = () => {
    logout().then(() => {
      window.location.href = '/login';
    });
  };

  return (
    <aside className="w-72 bg-surface text-text flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-border shadow-app font-sans">
      
      {/* 1. TOP BRAND AREA - Linear Style */}
      <div className="p-5 border-b border-border flex items-center gap-3">
        {/* 36px logo */}
        <div 
          className="w-[36px] h-[36px] rounded-app bg-brand-primary text-white font-black text-sm shrink-0 flex items-center justify-center shadow-app"
        >
          {activeCompanyName.substring(0, 2).toUpperCase()}
        </div>
        
        <div className="overflow-hidden">
          {/* 18px company name */}
          <h1 className="text-[18px] font-bold text-text truncate tracking-tight leading-tight">
            {activeCompanyName}
          </h1>
          {/* Small workspace label */}
          <p className="text-[10px] font-semibold text-muted tracking-wide mt-0.5 uppercase">
            Workspace
          </p>
        </div>
      </div>

      {/* 2. NAVIGATION AREA */}
      <nav className="flex-1 py-4 px-0 space-y-0.5 overflow-y-auto">
        <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-muted uppercase font-mono">
          Aplikace
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-6 py-2.5 text-xs font-semibold transition-all relative cursor-pointer ${
                isActive 
                  ? 'bg-brand-primary-soft/40 text-brand-primary' 
                  : 'text-muted hover:text-text hover:bg-surface-secondary'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* 3px left indicator */}
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-primary rounded-r-xs" />
                )}
                <Icon 
                  className={`w-4 h-4 ${isActive ? 'text-brand-primary' : 'text-muted'}`} 
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-brand-primary opacity-60" />
              )}
            </button>
          );
        })}

        {onOpenDemoGenerator && (
          <div className="pt-4 border-t border-border mt-4 px-6">
            <button
              onClick={onOpenDemoGenerator}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-app text-xs font-semibold text-text bg-surface-secondary hover:bg-surface-tertiary border border-border transition-colors text-left cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span>Generátor dema</span>
            </button>
          </div>
        )}
      </nav>

      {/* 3. BOTTOM PROFILE + UTILITIES AREA */}
      <div className="p-4 border-t border-border bg-surface-secondary flex flex-col gap-3">
        {/* Compact profile */}
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div 
            className="w-8 h-8 rounded-app bg-brand-primary text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-app"
          >
            {(dbUser?.email || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-text truncate">
              {dbUser?.email || user?.email || 'Majitel CRM'}
            </p>
            <p className="text-[9px] font-semibold text-muted uppercase tracking-wider">
              {dbUser?.role || 'owner'}
            </p>
          </div>
        </div>

        {/* Logout and Settings Bottom Buttons */}
        <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
          <button
            onClick={() => setCurrentTab('settings')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-app text-xs font-semibold transition-colors cursor-pointer ${
              currentTab === 'settings' 
                ? 'bg-brand-primary-soft text-brand-primary' 
                : 'text-muted hover:text-text hover:bg-surface-tertiary'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Nastavení</span>
          </button>

          <button
            onClick={handleLogout}
            title="Odhlásit se"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-app text-xs font-semibold text-muted hover:text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Odhlásit</span>
          </button>
        </div>

      </div>
    </aside>
  );
};
