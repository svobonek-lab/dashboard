import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Building, Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert, LayoutDashboard, Users, Calendar, Inbox } from 'lucide-react';

interface LoginPageProps {
  onSuccess: (user?: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { currentOrg, isConfigured, login, signUp, error: contextError } = useOrganization();
  const branding = currentOrg?.branding || {};
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('var(--brand-primary)');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('inviteToken') || params.get('token');
    const emailParam = params.get('email');
    if (token) setInviteToken(token);
    if (emailParam) setEmail(emailParam);
  }, []);

  const activeCompanyName = currentOrg?.name || branding.name || 'Vaše Stavební Firma';
  const activeLogo = currentOrg?.branding?.logoUrl || branding.logoUrl;
  
  const displayBrandColor = mode === 'signup' && primaryColor !== 'var(--brand-primary)' ? primaryColor : 'var(--brand-primary)';
  const displayOrgName = mode === 'signup' && orgName ? orgName : activeCompanyName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const user = await login(email, password);
        onSuccess(user);
      } else {
        await signUp(email, password, orgName);
        if (isConfigured) {
          setSuccessMessage("Zkontrolujte svůj e-mail a potvrďte registraci, poté se budete moci přihlásit.");
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Neznámá chyba');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickRole = async (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    try {
      const user = await login(targetEmail, targetPass);
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Přihlášení se nezdařilo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex font-sans">
      
      {/* Dynamic Left Preview Area (Sidebar Mockup) */}
      <div className="hidden lg:flex w-72 bg-surface border-r border-border flex-col shadow-app transition-colors duration-300">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div 
            className="w-[36px] h-[36px] rounded-app text-white font-black text-sm shrink-0 flex items-center justify-center shadow-app transition-colors duration-300"
            style={{ backgroundColor: displayBrandColor }}
          >
            {displayOrgName.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h1 className="text-[18px] font-bold text-text truncate tracking-tight leading-tight transition-all">
              {displayOrgName}
            </h1>
            <p className="text-[10px] font-semibold text-muted tracking-wide mt-0.5 uppercase">
              Workspace
            </p>
          </div>
        </div>
        
        <div className="flex-1 p-4 space-y-1">
           <div className="px-2 pb-2 text-[10px] font-bold tracking-wider text-muted uppercase font-mono mt-2">
             Aplikace (Náhled)
           </div>
           
           {[
             { icon: LayoutDashboard, label: 'Přehled stavby', active: true },
             { icon: Inbox, label: 'Poptávky & Kanban', active: false },
             { icon: Calendar, label: 'Harmonogram', active: false },
             { icon: Users, label: 'Tým & Řemeslníci', active: false }
           ].map((item, i) => (
             <div 
                key={i} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-app text-xs font-semibold relative ${item.active ? 'text-brand-primary' : 'text-muted'}`}
                style={item.active ? { backgroundColor: `${displayBrandColor}20`, color: displayBrandColor } : {}}
              >
                {item.active && (
                  <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-xs transition-colors duration-300" style={{ backgroundColor: displayBrandColor }} />
                )}
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Right Login/Signup Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-surface-secondary">
         <div className="max-w-md w-full bg-surface border border-border p-8 sm:p-10 rounded-[24px] shadow-app">
            
            <div className="text-center mb-8">
              <div 
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md text-white font-black text-2xl transition-colors duration-300"
                style={{ backgroundColor: displayBrandColor }}
              >
                 {displayOrgName.substring(0, 2).toUpperCase()}
              </div>
              <h2 className="text-2xl font-black text-text tracking-tight">
                {mode === 'login' ? 'Přihlášení do workspace' : 'Vytvořit firemní workspace'}
              </h2>
              <p className="text-sm text-muted font-medium mt-2">
                {mode === 'login' 
                  ? `Vstupte do zabezpečeného prostoru firmy ${displayOrgName}` 
                  : 'Vytvořte si vlastní oddělený prostor (tenant) na platformě.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {inviteToken && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-app text-xs font-semibold leading-relaxed space-y-1">
                  <p className="flex items-center gap-1.5 font-bold text-amber-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" /> Pozvánka pro zaměstnance
                  </p>
                  <p className="text-amber-700">
                    Byli jste pozváni do týmu <strong>{displayOrgName}</strong>. Přihlaste se svými údaji pro dokončení aktivace účtu.
                  </p>
                </div>
              )}
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-app text-xs font-bold flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-app text-xs font-bold leading-relaxed space-y-1">
                  <p className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Registrace úspěšná</p>
                  <p className="text-green-600 font-medium">{successMessage}</p>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">Název vaší firmy</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted">
                        <Building className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-app text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                        style={{ '--tw-ring-color': displayBrandColor } as React.CSSProperties}
                        placeholder="Např. Stavební pergoly s.r.o."
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">Hlavní barva značky</label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 border border-border rounded-app overflow-hidden shrink-0 shadow-sm">
                        <input
                          type="color"
                          value={primaryColor === 'var(--brand-primary)' ? '#2563eb' : primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150 bg-transparent"
                        />
                      </div>
                      <span className="font-mono text-sm font-bold text-text">{primaryColor === 'var(--brand-primary)' ? '#2563eb' : primaryColor}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">E-mail</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-app text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': displayBrandColor } as React.CSSProperties}
                      placeholder="jmeno@firma.cz"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-1.5">Heslo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-app text-sm font-semibold text-text focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': displayBrandColor } as React.CSSProperties}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              {mode === 'login' && (
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted uppercase tracking-wider">
                    <span>Rychlé přihlášení (1-klik role):</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickRole('majitel@firma.cz', 'demo123')}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 text-left transition-all group cursor-pointer disabled:opacity-50"
                    >
                      <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600">👔 Majitel</div>
                      <div className="text-[9px] text-slate-500 truncate">CRM & Finance</div>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickRole('zamestnanec@firma.cz', 'zam123')}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 text-left transition-all group cursor-pointer disabled:opacity-50"
                    >
                      <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600">👷 Řemeslník</div>
                      <div className="text-[9px] text-slate-500 truncate">Terén & Deník</div>
                    </button>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleQuickRole('svobonek@gmail.com', 'AP11hynek')}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 text-left transition-all group cursor-pointer disabled:opacity-50"
                    >
                      <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-600">⚡ SuperAdmin</div>
                      <div className="text-[9px] text-slate-500 truncate">Multi-tenant</div>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-app text-sm font-bold shadow-app transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] mt-4 cursor-pointer"
                style={{
                  backgroundColor: displayBrandColor,
                  color: '#ffffff',
                }}
              >
                {isLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Pokračovat do workspace' : 'Vytvořit firmu & Spustit'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6 text-sm text-muted font-medium">
              {mode === 'login' ? (
                <>
                  Nemáte firemní prostor?{' '}
                  <button 
                    onClick={() => setMode('signup')} 
                    className="font-bold hover:underline transition-colors"
                    style={{ color: displayBrandColor }}
                  >
                    Založit nový workspace
                  </button>
                </>
              ) : (
                <>
                  Již máte u nás účet?{' '}
                  <button 
                    onClick={() => setMode('login')} 
                    className="font-bold hover:underline transition-colors"
                    style={{ color: displayBrandColor }}
                  >
                    Přihlásit se
                  </button>
                </>
              )}
            </div>
         </div>
      </div>
    </div>
  );
};
