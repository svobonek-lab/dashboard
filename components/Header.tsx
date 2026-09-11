import React, { useState } from 'react';
import { Search, Bell, Shield, UserCheck, Sparkles, Wand2, Database, LogIn, LogOut, CheckCircle, ChevronDown, Plus, Globe } from 'lucide-react';
import { CompanyBranding, CRMNotification } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { useOrganization } from '@/context/OrganizationContext';

interface HeaderProps {
  branding: CompanyBranding;
  activeRole: 'owner' | 'employee';
  setActiveRole: (role: 'owner' | 'employee') => void;
  onOpenDemoGenerator: () => void;
  onOpenOnboarding?: () => void;
  notifications: CRMNotification[];
  onMarkAllRead: () => void;
  onOpenCommandPalette: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  branding,
  activeRole,
  setActiveRole,
  onOpenDemoGenerator,
  onOpenOnboarding,
  notifications,
  onMarkAllRead,
  onOpenCommandPalette
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isTenantMenuOpen, setIsTenantMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [showNewOrgInput, setShowNewOrgInput] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    isConfigured,
    user,
    dbUser,
    currentOrg,
    organizations,
    schemaError,
    clearSchemaError,
    login,
    signUp,
    logout,
    createOrganization,
    switchOrganization
  } = useOrganization();

  const [copiedSql, setCopiedSql] = useState(false);

  const sqlScript = `-- Spusťte tento skript v Supabase SQL Editoru pro vytvoření všech chybějících tabulek:

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  primary_color text default '#0A4EA3',
  logo_url text,
  created_at timestamp default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id),
  organization_id uuid references organizations(id),
  role text default 'owner'
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  name text,
  specialization text,
  capacity integer default 100
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  customer_name text,
  phone text,
  email text,
  project_type text,
  budget integer,
  status text default 'new',
  created_at timestamp default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  lead_id uuid references leads(id),
  assigned_employee text,
  status text default 'draft'
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'login') {
        await login(email, password);
      } else {
        await signUp(email, password, orgName);
      }
      setIsAuthModalOpen(false);
      setEmail('');
      setPassword('');
      setOrgName('');
    } catch (err: any) {
      setAuthError(err.message || 'Chyba při přihlašování');
    }
  };

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const newOrg = await createOrganization(newOrgName);
      await switchOrganization(newOrg.id);
      setNewOrgName('');
      setShowNewOrgInput(false);
    } catch (err: any) {
      alert(err.message || 'Nepodařilo se vytvořit organizaci');
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {currentOrg?.name || branding.name} CRM
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Multi-Tenant Supabase Portal • {branding.city}
          </p>
        </div>

        {/* Role Switcher for Sales Demo */}
        <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveRole('owner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeRole === 'owner'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Owner Dashboard</span>
          </button>
          <button
            onClick={() => setActiveRole('employee')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeRole === 'employee'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Employee Mobile App</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Supabase Status Indicator Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-600 shadow-3xs">
          <Database className={`w-3.5 h-3.5 ${isConfigured ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
          <span>{isConfigured ? 'Supabase Connected' : 'Local Sandbox Mode'}</span>
        </div>

        {/* Search Bar / Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center gap-3 w-64 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-400 hover:border-slate-300 transition-all text-left"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="flex-1 truncate">Search leads, clients...</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-mono text-slate-500 shadow-2xs">Ctrl+K</kbd>
        </button>

        {/* Setup Onboarding Wizard CTA */}
        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200"
          >
            <Wand2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Setup Wizard</span>
          </button>
        )}

        {/* Generate New Demo CTA */}
        <button
          onClick={onOpenDemoGenerator}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:opacity-95"
          style={{ backgroundColor: currentOrg?.primary_color || branding.primaryColor }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Demo URL</span>
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          <NotificationCenter
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            notifications={notifications}
            onMarkAllRead={onMarkAllRead}
          />
        </div>

        {/* Multi-Tenant Organization Switcher & Auth */}
        <div className="relative">
          <button
            onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
            className="flex items-center gap-3 pl-4 border-l border-slate-200 text-left hover:opacity-85 transition-all"
          >
            <img
              src={currentOrg?.logo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
              alt="Profile"
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-200"
            />
            <div className="hidden xl:block">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                  {currentOrg?.name || 'Jan Svoboda'}
                </p>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                {dbUser?.role || 'Owner'} ({currentOrg?.slug || 'personal'})
              </p>
            </div>
          </button>

          {isTenantMenuOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3">
              <div className="space-y-3">
                <div className="pb-3 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Active Tenant</p>
                  <p className="text-sm font-black text-slate-800 mt-1">{currentOrg?.name || 'Moje Firma'}</p>
                  <p className="text-[11px] text-slate-500">{user?.email || 'svobonek@gmail.com'}</p>
                </div>

                {/* Tenant List */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Switch Organization</p>
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={async () => {
                        await switchOrganization(org.id);
                        setIsTenantMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                        currentOrg?.id === org.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{org.name}</span>
                      {currentOrg?.id === org.id && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>

                {/* Add new Organization input form */}
                {showNewOrgInput ? (
                  <form onSubmit={handleCreateOrgSubmit} className="space-y-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder="Organization Name..."
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewOrgInput(false)}
                        className="flex-1 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewOrgInput(true)}
                    className="w-full py-2.5 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Organization</span>
                  </button>
                )}

                {/* Auth Controls */}
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  {isConfigured ? (
                    user && !user.id.startsWith('user-demo') && !user.id.startsWith('user-virtual') ? (
                      <button
                        onClick={async () => {
                          await logout();
                          setIsTenantMenuOpen(false);
                        }}
                        className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setAuthMode('login');
                          setIsAuthModalOpen(true);
                          setIsTenantMenuOpen(false);
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Connect Supabase Account</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setIsAuthModalOpen(true);
                        setIsTenantMenuOpen(false);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Virtual Tenant</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supabase Authentication Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">
                {isConfigured ? 'Supabase Authentication' : 'Create Virtual Sandbox Tenant'}
              </h3>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {!isConfigured && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 leading-relaxed">
                <strong>Tip pro vývojáře:</strong> Supabase není připojen přes .env proměnné (<code>VITE_SUPABASE_URL</code>). Nyní běžíte ve virtuálním Sandboxu. Zde si můžete vyzkoušet plnou registraci, multitenanci a ukládání do LocalStorage!
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold">
                  {authError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block">E-mail Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Company / Tenant Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full mt-1 p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                    placeholder="Stavební Firma s.r.o."
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                {authMode === 'login' ? 'Přihlásit se' : 'Zaregistrovat firmu'}
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-slate-500 font-medium">
              {authMode === 'login' ? (
                <>
                  Nemáte ještě firemní účet?{' '}
                  <button onClick={() => setAuthMode('signup')} className="text-blue-600 font-bold hover:underline">
                    Zaregistrovat se
                  </button>
                </>
              ) : (
                <>
                  Již máte vytvořený účet?{' '}
                  <button onClick={() => setAuthMode('login')} className="text-blue-600 font-bold hover:underline">
                    Přihlásit se
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schema Error Dialog for PGRST125 */}
      {schemaError && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Database className="w-5 h-5" />
                <h3 className="text-lg font-black tracking-tight">Chyba struktury databáze (PGRST125)</h3>
              </div>
              <button
                onClick={clearSchemaError}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
              <p className="font-bold text-slate-800">
                {schemaError}
              </p>
              <p>
                Pro zachování plné funkčnosti aplikace CRM automaticky aktivovalo <strong>Sandbox Mód s ukládáním do Local Storage</strong>. Můžete aplikaci plnohodnotně používat, vytvářet zakázky, plánovat kapacity i přepínat organizace!
              </p>
              <p className="text-xs text-slate-500">
                Pokud si přejete integrovat Supabase s reálnou databází, spusťte následující SQL příkaz v <strong>Supabase SQL Editoru</strong> ve vašem projektu:
              </p>
            </div>

            <div className="relative bg-slate-900 rounded-2xl p-4 overflow-hidden max-h-60 overflow-y-auto">
              <pre className="text-xs text-emerald-400 font-mono select-all whitespace-pre-wrap">{sqlScript}</pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-lg transition-all"
              >
                {copiedSql ? 'Kopírováno!' : 'Kopírovat SQL'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={clearSchemaError}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Rozumím, pokračovat v Sandboxu
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

