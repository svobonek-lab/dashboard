import React, { useState } from 'react';
import { Search, Bell, Shield, UserCheck, Sparkles, Wand2, Database, LogIn, LogOut, CheckCircle, ChevronDown, Plus, Globe } from 'lucide-react';
import { CompanyBranding, CRMNotification } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { ConnectionStatusBanner } from './ConnectionStatusBanner';
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
    <header className="h-16 bg-surface border-b border-border px-8 flex items-center justify-between sticky top-0 z-20 text-text">
      <div className="flex items-center gap-6">
        <div>
          <h2 className="text-base font-bold text-text tracking-tight">
            {currentOrg?.name || branding.name} CRM
          </h2>
          <p className="text-[11px] text-muted font-medium">
            {branding.city}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar / Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center gap-3 w-64 bg-surface-secondary border border-border rounded-app px-3.5 py-1.5 text-xs text-muted hover:border-brand-primary transition-all text-left cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-muted" />
          <span className="flex-1 truncate text-muted">Hledat zakázky, klienty...</span>
          <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded-md text-[10px] font-mono text-muted shadow-app">Ctrl+K</kbd>
        </button>

        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-9 h-9 rounded-app bg-surface-secondary border border-border flex items-center justify-center text-muted hover:text-text hover:bg-surface-tertiary transition-all relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
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
            className="flex items-center gap-3 pl-4 border-l border-border text-left hover:opacity-85 transition-all cursor-pointer"
          >
            <img
              src={currentOrg?.logo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
              alt="Profile"
              className="w-8 h-8 rounded-app object-cover border border-border"
            />
            <div className="hidden xl:block">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-text truncate max-w-[130px]">
                  {currentOrg?.name || 'Jan Svoboda'}
                </p>
                <ChevronDown className="w-3 h-3 text-muted" />
              </div>
              <p className="text-[9px] text-brand-primary uppercase font-bold tracking-wider">
                {dbUser?.role || 'Owner'}
              </p>
            </div>
          </button>

          {isTenantMenuOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3 text-slate-900">
              <div className="space-y-3">
                <div className="pb-3 border-b border-slate-200">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Aktivní organizace</p>
                  <p className="text-sm font-black text-slate-900 mt-1">{currentOrg?.name || 'Moje Firma'}</p>
                  <p className="text-[11px] text-slate-500">{user?.email || 'sprava@firma.cz'}</p>
                </div>

                {/* Tenant List */}
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Přepnout společnost</p>
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={async () => {
                        await switchOrganization(org.id);
                        setIsTenantMenuOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                        currentOrg?.id === org.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{org.name}</span>
                      {currentOrg?.id === org.id && <CheckCircle className="w-3.5 h-3.5" style={{ color: currentOrg?.primary_color || branding.primaryColor || '#2563eb' }} />}
                    </button>
                  ))}
                </div>

                {/* Add new Organization input form */}
                {showNewOrgInput ? (
                  <form onSubmit={handleCreateOrgSubmit} className="space-y-2 pt-2 border-t border-slate-200">
                    <input
                      type="text"
                      placeholder="Název organizace..."
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none"
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 text-white rounded-xl text-xs font-bold transition-all hover:opacity-95"
                        style={{ backgroundColor: currentOrg?.primary_color || branding.primaryColor || '#2563eb' }}
                      >
                        Vytvořit
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewOrgInput(false)}
                        className="flex-1 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold"
                      >
                        Zrušit
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewOrgInput(true)}
                    className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Založit novou firmu</span>
                  </button>
                )}

                {/* Auth Controls */}
                <div className="pt-3 border-t border-slate-200 flex gap-2">
                  {isConfigured ? (
                    user && !user.id.startsWith('user-demo') && !user.id.startsWith('user-virtual') ? (
                      <button
                        onClick={async () => {
                          await logout();
                          setIsTenantMenuOpen(false);
                        }}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Odhlásit se</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setAuthMode('login');
                          setIsAuthModalOpen(true);
                          setIsTenantMenuOpen(false);
                        }}
                        className="w-full py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:opacity-95"
                        style={{ backgroundColor: currentOrg?.primary_color || branding.primaryColor || '#2563eb' }}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Připojit účet</span>
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => {
                        setAuthMode('login');
                        setIsAuthModalOpen(true);
                        setIsTenantMenuOpen(false);
                      }}
                      className="w-full py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs hover:opacity-95"
                      style={{ backgroundColor: currentOrg?.primary_color || branding.primaryColor || '#2563eb' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Vytvořit virtuální firmu</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900">
                {isConfigured ? 'Přihlášení do databáze' : 'Vytvořit virtuální firmu (Sandbox)'}
              </h3>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {!isConfigured && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 leading-relaxed">
                <strong>Režim lokálního úložiště:</strong> Aplikace ukládá firemní data bezpečně lokálně. Zde si můžete vyzkoušet plnou registraci, multitenanci a izolaci dat jednotlivých firem!
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {authError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block">E-mailová adresa</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                  placeholder="jmeno@firma.cz"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Heslo</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                  placeholder="••••••••"
                  required
                />
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block">Název firmy / organizace</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium text-slate-900"
                    placeholder="Stavební Firma s.r.o."
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:opacity-95"
                style={{ backgroundColor: currentOrg?.primary_color || branding.primaryColor || '#2563eb' }}
              >
                {authMode === 'login' ? 'Přihlásit se' : 'Zaregistrovat firmu'}
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-slate-500 font-medium">
              {authMode === 'login' ? (
                <>
                  Nemáte ještě firemní účet?{' '}
                  <button 
                    onClick={() => setAuthMode('signup')} 
                    className="font-bold hover:underline"
                    style={{ color: currentOrg?.primary_color || branding.primaryColor || '#2563eb' }}
                  >
                    Zaregistrovat se
                  </button>
                </>
              ) : (
                <>
                  Již máte vytvořený účet?{' '}
                  <button 
                    onClick={() => setAuthMode('login')} 
                    className="font-bold hover:underline"
                    style={{ color: currentOrg?.primary_color || branding.primaryColor || '#2563eb' }}
                  >
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
        <div className="fixed inset-0 z-50 bg-slate-50/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-rose-500">
                <Database className="w-5 h-5" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">Chyba struktury databáze (PGRST125)</h3>
              </div>
              <button
                onClick={clearSchemaError}
                className="text-slate-500 hover:text-slate-800 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-slate-700 text-sm leading-relaxed">
              <p className="font-bold text-slate-900">
                {schemaError}
              </p>
              <p>
                Pro zachování plné funkčnosti aplikace CRM automaticky aktivovalo <strong>Sandbox Mód s ukládáním do Local Storage</strong>. Můžete aplikaci plnohodnotně používat, vytvářet zakázky, plánovat kapacity i přepínat organizace!
              </p>
              <p className="text-xs text-slate-500">
                Pokud si přejete integrovat Supabase s reálnou databází, spusťte následující SQL příkaz v <strong>Supabase SQL Editoru</strong> ve vašem projektu:
              </p>
            </div>

            <div className="relative bg-slate-50 rounded-2xl p-4 overflow-hidden max-h-60 overflow-y-auto border border-slate-200">
              <pre className="text-xs text-green-400 font-mono select-all whitespace-pre-wrap">{sqlScript}</pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-900 text-[11px] font-bold rounded-lg transition-all"
              >
                {copiedSql ? 'Kopírováno!' : 'Kopírovat SQL'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={clearSchemaError}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold shadow-sm transition-all"
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

