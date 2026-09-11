import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useBranding } from '@/hooks/useBranding';
import { useRouter, Link } from '../app/router';
import { 
  LayoutDashboard, 
  Kanban, 
  HardHat, 
  Calendar, 
  Users, 
  BarChart3, 
  FileText, 
  FolderArchive, 
  MessageSquare, 
  Code2, 
  Globe, 
  Settings, 
  Sparkles, 
  Bell, 
  Search, 
  Plus, 
  LogOut, 
  ChevronRight,
  Shield,
  Download,
  CheckCircle2,
  X,
  FileArchive
} from 'lucide-react';
import { CRMNotification, CompanyBranding, Lead } from '@/types';
import { NotificationCenter } from '@/components/NotificationCenter';
import { CommandPalette } from '@/components/CommandPalette';
import { DemoGeneratorModal } from '@/components/DemoGeneratorModal';
import { OnboardingWizardModal } from '@/components/OnboardingWizardModal';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';

interface OwnerLayoutProps {
  children: React.ReactNode;
  leads?: Lead[];
  onSelectLead?: (lead: Lead) => void;
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({ 
  children,
  leads = [],
  onSelectLead
}) => {
  const { branding, updateBranding } = useBranding();
  const { 
    user, 
    dbUser, 
    currentOrg, 
    logout, 
    impersonatingOrgId, 
    stopImpersonation,
    switchRoleToSuperAdmin
  } = useOrganization();
  const { pathname, navigate, isActive } = useRouter();

  // Modals & popovers
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isExportZipOpen, setIsExportZipOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<CRMNotification[]>([
    { id: 'n-1', title: 'Nová poptávka na pergolu', message: 'Ing. Jan Svoboda odeslal poptávku na bioklimatickou pergolu 6x4m.', timestamp: '10 min', read: false, type: 'lead' },
    { id: 'n-2', title: 'Záloha připsána', message: 'Přijata platba zálohy 220 000 Kč k zakázce POL-2026-0492.', timestamp: '1 hod', read: false, type: 'quote' },
    { id: 'n-3', title: 'Fotografie ze stavby', message: 'Petr Novotný nahrál 3 fotky z montáže krovu.', timestamp: '3 hod', read: true, type: 'employee' }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Keyboard shortcut listener for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { label: 'Přehled stavby (Executive)', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'Poptávky & Kanban', path: '/leads', icon: Kanban, badge: leads.filter(l => l.status === 'New').length ? `${leads.filter(l => l.status === 'New').length} nové` : undefined },
    { label: 'Realizace & Stavby', path: '/projects', icon: HardHat },
    { label: 'Harmonogram výjezdů', path: '/calendar', icon: Calendar },
    { label: 'Tým & Řemeslníci', path: '/employees', icon: Users },
    { label: 'Analytika & Marže', path: '/analytics', icon: BarChart3 },
    { label: 'Cenové nabídky & PDF', path: '/quotes', icon: FileText },
    { label: 'Dokumenty & Protokoly', path: '/documents', icon: FolderArchive },
    { label: 'Komunikační centrum', path: '/communication', icon: MessageSquare },
    { label: 'Embed Lead Widget', path: '/widget', icon: Code2 },
    { label: 'Klientský portál', path: '/portal', icon: Globe },
    { label: 'Nastavení & Export', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* Super Admin Impersonation Banner (Company Workspace) */}
      {impersonatingOrgId && (
        <div className="bg-[#0C111D] border-b border-slate-800 px-6 h-12 flex items-center justify-between text-xs font-bold shadow-md fixed top-0 w-full z-50">
          <div className="flex items-center gap-3">
            <span className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
              Company Workspace
            </span>
            <span className="text-slate-300 font-medium">Viewing as: <strong className="text-white ml-1">{branding?.name}</strong></span>
          </div>
          <button
            onClick={() => {
              stopImpersonation();
              navigate('/admin');
            }}
            className="hover:bg-slate-800 text-cyan-400 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2"
          >
            ← Back to Platform
          </button>
        </div>
      )}

      <div className={`flex flex-1 ${impersonatingOrgId ? 'pt-12' : ''}`}>
        {/* 280px Executive Navigation Sidebar (Light Theme) */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30 shadow-sm transition-all" style={{ top: impersonatingOrgId ? '48px' : '0' }}>
          
          {/* Company Identity Header */}
          <div>
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0 overflow-hidden"
                  style={{ backgroundColor: branding?.primaryColor || '#0A4EA3' }}
                >
                  {branding?.logoUrl ? (
                    <img src={branding.logoUrl} alt={branding.name} className="w-full h-full object-cover" />
                  ) : (
                    (branding?.name || 'S').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-extrabold text-sm text-slate-800 truncate tracking-tight">
                      {branding?.name || 'StavbaCore CRM'}
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {branding?.city || 'Praha'} • Operační systém
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Search Trigger */}
            <div className="px-4 pt-4">
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 transition-all shadow-sm group"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <span>Rychlé hledání...</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 text-slate-400 rounded-md shadow-sm">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Nav Items List */}
            <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-280px)]">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Správa zakázek & realizace
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    exact={item.exact}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      active
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 transition-colors ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        active ? 'bg-blue-200 text-blue-800' : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom User Box */}
          <div className="p-4 border-t border-slate-100 space-y-3 bg-white">
            
            {/* Quick AI Audit / Demo button */}
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 border border-transparent hover:border-orange-500 hover:shadow-lg hover:shadow-amber-500/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Demo Generator</span>
            </button>

            {/* Super Admin Control Center switch button */}
            <button
              onClick={() => {
                switchRoleToSuperAdmin();
                navigate('/admin');
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Admin Platform</span>
            </button>

            {/* User profile details */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div 
                  className="w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: branding?.primaryColor || '#F59E0B' }}
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{dbUser?.email || user?.email || 'majitel@firma.cz'}</p>
                  <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">{dbUser?.role === 'super_admin' ? 'Super Admin' : dbUser?.role || 'Majitel'}</p>
                </div>
              </div>

              <button
                onClick={() => logout().then(() => navigate('/login'))}
                title="Odhlásit se z CRM"
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </aside>

        {/* Main Executive Content Canvas */}
        <div className="flex-1 ml-72 flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">


        {/* Executive Header Bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <div className="h-4 w-px bg-slate-200"></div>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Dispečink aktivní
            </span>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Quick Actions */}
            <button
              onClick={() => navigate('/quotes')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Vytvořit nabídku</span>
            </button>

            <button
              onClick={() => navigate('/leads')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Nová zakázka</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition-colors relative shadow-sm"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-100">Upozornění & Zprávy</span>
                    <button
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                      className="text-[10px] text-amber-400 hover:underline font-semibold"
                    >
                      Označit vše jako přečtené
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-2.5 rounded-xl text-xs space-y-1 ${n.read ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-950 text-slate-200 border border-slate-800'}`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className={n.read ? 'text-slate-300' : 'text-amber-400'}>{n.title}</span>
                          <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      </div>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant branding={branding} leads={leads} />

      {/* Modals & Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => {
          navigate(`/${tab}`);
        }}
        onSelectLead={(l) => {
          if (onSelectLead) onSelectLead(l);
          navigate(`/leads`);
        }}
        leads={leads}
        branding={branding}
      />

      <DemoGeneratorModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onDemoGenerated={(newBranding) => {
          updateBranding(newBranding);
          setIsDemoModalOpen(false);
        }}
      />

      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentBranding={branding}
        onCompleteOnboarding={(updatedBranding) => {
          updateBranding(updatedBranding);
          setIsOnboardingOpen(false);
        }}
      />

    </div>
  );
};
