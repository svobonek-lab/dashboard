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
  const { branding, updateBranding, palette, brandStyles } = useBranding();
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-500/30">
      
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
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
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
        {/* 280px Executive Navigation Sidebar (White-Labeled) */}
        <aside 
          className="w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-30 shadow-sm transition-all" 
          style={{ top: isSuperAdminUser ? '56px' : '0' }}
        >
          
          {/* Company Identity Header */}
          <div>
            <div className="p-5 border-b border-slate-100 relative overflow-hidden">
              {/* Subtle top brand tint */}
              <div 
                className="absolute inset-x-0 top-0 h-1" 
                style={{ background: palette.gradientPrimary }}
              ></div>

              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0 overflow-hidden transition-transform duration-300 hover:scale-105"
                  style={{ 
                    backgroundColor: palette.primary,
                    color: palette.textOnPrimary,
                    boxShadow: palette.primaryGlow
                  }}
                >
                  {activeLogo ? (
                    <img src={activeLogo} alt={activeCompanyName} className="w-full h-full object-cover" />
                  ) : (
                    activeCompanyName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-extrabold text-sm text-slate-900 truncate tracking-tight">
                      {activeCompanyName}
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5">
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: palette.primary }}
                    ></span>
                    {activeCity} • Operační systém
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
                  <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  <span>Rychlé hledání...</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 text-slate-400 rounded-md shadow-sm">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Nav Items List */}
            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
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
                    style={active ? {
                      backgroundColor: palette.primarySubtle,
                      color: palette.primary,
                      borderColor: palette.primaryBorder,
                      borderLeft: `3px solid ${palette.primary}`
                    } : undefined}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                      active
                        ? 'shadow-sm border'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon 
                        className="w-4 h-4 transition-colors" 
                        style={active ? { color: palette.primary } : undefined}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={active ? {
                          backgroundColor: palette.primaryLight,
                          color: palette.primary
                        } : {
                          backgroundColor: '#FEF3C7',
                          color: '#B45309'
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom User Box */}
          <div className="p-4 border-t border-slate-100 space-y-2.5 bg-white">
            
            {/* Install Studio / White Label Live Customizer Button */}
            <button
              onClick={() => navigate('/install')}
              className="w-full py-2.5 px-3 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.99]"
              style={{
                background: palette.gradientPrimary,
                boxShadow: `0 4px 12px -2px ${palette.primaryLight}`
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>White-Label Studio</span>
            </button>

            {/* Super Admin Control Center switch button (Strictly for svobonek@gmail.com) */}
            {(user?.email?.toLowerCase() === 'svobonek@gmail.com' || dbUser?.email?.toLowerCase() === 'svobonek@gmail.com' || dbUser?.role === 'super_admin' || dbUser?.role === 'superadmin') && (
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
            )}

            {/* User profile details */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div 
                  className="w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm"
                  style={{ 
                    backgroundColor: palette.primary,
                    color: palette.textOnPrimary
                  }}
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 truncate">{dbUser?.email || user?.email || 'majitel@firma.cz'}</p>
                  <p 
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: palette.primary }}
                  >
                    {dbUser?.role === 'super_admin' ? 'Super Admin' : dbUser?.role || 'Majitel CRM'}
                  </p>
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

        {/* Executive Header Bar (White-Labeled) */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500">
              {new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            {/* Dynamic brand gradient divider */}
            <div 
              className="h-4 w-1 rounded-full opacity-60"
              style={{ background: palette.gradientPrimary }}
            ></div>
            <span 
              className="text-xs font-bold flex items-center gap-1.5"
              style={{ color: palette.primary }}
            >
              <span 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: palette.primary }}
              ></span>
              {activeCompanyName} • Dispečink aktivní
            </span>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Quick Actions */}
            <button
              onClick={() => navigate('/quotes')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:border-slate-300"
            >
              <FileText className="w-3.5 h-3.5" style={{ color: palette.primary }} />
              <span>Vytvořit nabídku</span>
            </button>

            <button
              onClick={() => navigate('/leads')}
              style={{
                backgroundColor: palette.primary,
                color: palette.textOnPrimary,
                boxShadow: palette.primaryGlow
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-md active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Nová zakázka</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(prev => !prev)}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors relative shadow-sm"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span 
                    className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ backgroundColor: palette.primary }}
                  ></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-100">Upozornění & Zprávy</span>
                    <button
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                      className="text-[10px] font-semibold hover:underline"
                      style={{ color: palette.primary }}
                    >
                      Označit vše jako přečtené
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-2.5 rounded-xl text-xs space-y-1 ${n.read ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-950 text-slate-200 border border-slate-800'}`}>
                        <div className="flex items-center justify-between font-bold">
                          <span className={n.read ? 'text-slate-300' : 'font-bold'} style={!n.read ? { color: palette.primary } : undefined}>
                            {n.title}
                          </span>
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

