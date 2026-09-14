import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
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
  Menu,
  FileArchive,
  Building2
} from 'lucide-react';
import { CRMNotification, CompanyBranding, Lead } from '@/types';
import { NotificationCenter } from '@/components/NotificationCenter';
import { CommandPalette } from '@/components/CommandPalette';
import { DemoGeneratorModal } from '@/components/DemoGeneratorModal';
import { OnboardingWizardModal } from '@/components/OnboardingWizardModal';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';
import { CompanySwitcher } from '@/components/CompanySwitcher';

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
  const { currentOrg, updateBrandingAdmin } = useOrganization();
  const branding = currentOrg?.branding || {};
  const { 
    user, 
    dbUser, 
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Effective company branding info
  const activeCompanyName = currentOrg?.name || branding.name || 'Vaše Stavební Firma';
  const activeLogo = currentOrg?.logo_url || branding.logoUrl;
  const activeCity = currentOrg?.city || branding.city || 'Česká republika';

  // Notifications State
  const [notifications, setNotifications] = useState<CRMNotification[]>([
    { id: 'n-1', title: 'Nová poptávka na realizaci', message: `Zákazník odeslal formulář z webu ${activeCompanyName}.`, timestamp: '10 min', read: false, type: 'lead' },
    { id: 'n-2', title: 'Záloha připsána', message: 'Přijata platba zálohy 220 000 Kč k zakázce POL-2026-0492.', timestamp: '1 hod', read: false, type: 'quote' },
    { id: 'n-3', title: 'Fotografie ze stavby', message: 'Montážní tým nahrál 3 fotky z postupu výstavby.', timestamp: '3 hod', read: true, type: 'employee' }
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
    { label: 'Poptávkový formulář', path: '/inquiry', icon: Sparkles },
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

  const isSuperAdminUser = (dbUser?.email || user?.email || '').trim().toLowerCase() === 'svobonek@gmail.com' || Boolean(impersonatingOrgId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-brand-primary-soft">
      
      {/* Super Admin Company Workspace Top Bar */}
      {isSuperAdminUser && (
        <div className="bg-[#0C111D] border-b border-slate-800 px-6 h-14 flex items-center justify-between text-xs font-bold shadow-lg fixed top-0 w-full z-50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                stopImpersonation();
                navigate('/admin');
              }}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-cyan-500/10"
            >
              ← Back to Platform
            </button>

            <div className="h-5 w-px bg-slate-800"></div>

            <div className="flex items-center gap-2.5">
              <span className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                Workspace
              </span>
              <span className="text-white font-black text-sm tracking-tight">{activeCompanyName}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {(currentOrg as any)?.plan || 'Enterprise'} Plan
              </span>
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Isolated Multi-Tenant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CompanySwitcher variant="workspace" />
          </div>
        </div>
      )}

      <div className={`flex flex-1 ${isSuperAdminUser ? 'pt-14' : ''}`}>
        {/* Mobile Drawer Overlay */}
        {isMobileDrawerOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
        )}

        {/* Sidebar - Desktop Fixed / Mobile Slide-in Drawer */}
        <aside 
          className={`w-72 bg-surface border-r border-border flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 shadow-app transition-transform duration-300 font-sans ${
            isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`} 
          style={{ top: isSuperAdminUser ? '56px' : '0' }}
        >
          {/* Top Brand & Identity Header */}
          <div>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                {/* 36px logo */}
                <div 
                  className="w-[36px] h-[36px] rounded-app bg-brand-primary text-white font-black text-sm shrink-0 flex items-center justify-center shadow-app overflow-hidden"
                >
                  {activeLogo ? (
                    <img src={activeLogo} alt={activeCompanyName} className="w-full h-full object-cover" />
                  ) : (
                    activeCompanyName.substring(0, 2).toUpperCase()
                  )}
                </div>
                
                <div className="overflow-hidden">
                  <h1 className="text-[17px] font-bold text-text truncate tracking-tight leading-tight">
                    {activeCompanyName}
                  </h1>
                  <p className="text-[10px] font-semibold text-muted tracking-wide mt-0.5 uppercase">
                    Workspace
                  </p>
                </div>
              </div>

              {/* Close Button on Mobile Drawer */}
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-secondary"
                aria-label="Zavřít menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Menu */}
            <nav className="py-4 px-0 space-y-0.5 overflow-y-auto max-h-[calc(100vh-250px)]">
              <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-muted uppercase font-mono">
                Aplikace
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    exact={item.exact}
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className={`w-full min-h-[44px] flex items-center justify-between px-6 py-2.5 text-xs font-semibold transition-all relative cursor-pointer ${
                      active 
                        ? 'bg-brand-primary-soft/40 text-brand-primary font-bold' 
                        : 'text-muted hover:text-text hover:bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* 3px left indicator */}
                      {active && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-primary rounded-r-xs" />
                      )}
                      <Icon 
                        className={`w-4 h-4 ${active ? 'text-brand-primary' : 'text-muted'}`} 
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary-soft text-brand-primary">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Compact Profile, Logout, and Settings */}
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
                  {dbUser?.role === 'super_admin' ? 'Super Admin' : dbUser?.role || 'owner'}
                </p>
              </div>
            </div>

            {/* Logout and Settings Bottom Buttons */}
            <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  navigate('/settings');
                }}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-app text-xs font-semibold text-muted hover:text-text hover:bg-surface-tertiary transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Nastavení</span>
              </button>

              <button
                onClick={() => logout().then(() => navigate('/login'))}
                title="Odhlásit se"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-app text-xs font-semibold text-muted hover:text-red-600 hover:bg-red-50/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Odhlásit</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Executive Content Canvas */}
        <div className="flex-1 lg:ml-72 w-full min-w-0 flex flex-col min-h-screen bg-surface-secondary relative overflow-x-hidden">

        {/* Rebuilt Header - Visual-Noise-Free with Design Tokens */}
        <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 text-text">
          {/* Left: Mobile Hamburger & Company Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] rounded-xl border border-border bg-surface flex items-center justify-center text-muted hover:text-text hover:bg-surface-secondary"
              aria-label="Otevřít menu navigace"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <h2 className="text-sm sm:text-base font-bold text-text tracking-tight truncate max-w-[160px] sm:max-w-xs">
                {activeCompanyName}
              </h2>
              <span className="hidden sm:inline-block text-[11px] text-muted font-medium bg-surface-secondary px-2.5 py-1 rounded-full border border-border">
                Dispečink aktivní
              </span>
            </div>
          </div>

          {/* Right: Search, Notifications, Profile/Switcher */}
          <div className="flex items-center gap-3">
            {/* Search Bar / Command Palette Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-3 w-64 bg-surface-secondary border border-border rounded-app px-3.5 py-1.5 text-xs text-muted hover:border-brand-primary transition-all text-left cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-muted" />
              <span className="flex-1 truncate text-muted">Hledat zakázky, klienty...</span>
              <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded-md text-[10px] font-mono text-muted shadow-app">⌘K</kbd>
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className="w-10 h-10 sm:w-9 sm:h-9 rounded-app bg-surface-secondary border border-border flex items-center justify-center text-muted hover:text-text hover:bg-surface-tertiary transition-all relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-surface border border-border rounded-app shadow-app p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-text">Upozornění & Zprávy</span>
                    <button
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                      className="text-[10px] font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      Označit vše
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-2.5 rounded-app text-xs space-y-1 ${n.read ? 'text-muted' : 'bg-surface-secondary text-text border border-border'}`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className={n.read ? 'text-muted' : 'text-brand-primary font-bold'}>
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted">{n.timestamp}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
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
          updateBrandingAdmin(currentOrg?.id || '', newBranding.name, newBranding.primaryColor, newBranding.logoUrl);
          setIsDemoModalOpen(false);
        }}
      />

      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentBranding={branding}
        onCompleteOnboarding={(updatedBranding) => {
          updateBrandingAdmin(currentOrg?.id || '', updatedBranding.name, updatedBranding.primaryColor, updatedBranding.logoUrl);
          setIsOnboardingOpen(false);
        }}
      />

    </div>
  );
};

