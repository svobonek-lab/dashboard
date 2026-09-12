import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { useBranding } from '@/hooks/useBranding';
import { Database, Shield, Layout, Sparkles, Building, Lock, Mail, ArrowRight, CheckCircle2, UserCheck, ShieldAlert, HardHat } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { isConfigured, login, signUp, error: contextError, currentOrg, organizations, switchOrganization } = useOrganization();
  const { branding, palette, brandStyles } = useBranding();
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(palette.primary || '#2563eb');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeCompanyName = currentOrg?.name || branding.name || 'Vaše Stavební Firma';
  const activeLogo = currentOrg?.logo_url || branding.logoUrl;
  const activeCity = currentOrg?.city || branding.city || 'Česká republika';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onSuccess();
      } else {
        await signUp(email, password, orgName);
        if (isConfigured) {
          setSuccessMessage("Zkontrolujte svůj e-mail a potvrďte registraci, poté se budete moci přihlásit.");
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Chyba při přihlašování. Zkontrolujte prosím své údaje.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill demo/test credentials
  const fillQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div id="login-page-container" className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100 selection:bg-blue-500/30">
      {/* Decorative dynamic company background mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
      <div 
        className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: palette.primary }}
      ></div>
      <div 
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: palette.secondary }}
      ></div>

      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden grid md:grid-cols-12 min-h-[620px] z-10">
        {/* Left column: Branded visual info card */}
        <div 
          className="md:col-span-5 text-white p-10 flex flex-col justify-between relative overflow-hidden border-r border-slate-800"
          style={{
            background: `linear-gradient(175deg, #090D16 0%, #030712 100%)`
          }}
        >
          {/* Subtle brand glow inside left panel */}
          <div 
            className="absolute top-0 left-0 right-0 h-48 opacity-25 blur-2xl pointer-events-none"
            style={{ background: palette.gradientHero }}
          ></div>
          
          <div className="space-y-6 z-10">
            <div 
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold"
              style={{
                backgroundColor: palette.primarySubtle,
                color: palette.primary,
                border: `1px solid ${palette.primaryBorder}`
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Firemní informační systém</span>
            </div>
            
            <div className="space-y-3">
              {/* Company Logo in Hero */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0 overflow-hidden"
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
                <div>
                  <h1 className="text-2xl font-black tracking-tight leading-tight text-white">
                    {activeCompanyName}
                  </h1>
                  <p className="text-xs text-slate-400 font-medium">
                    {activeCity} • Operační systém
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-slate-300 font-normal leading-relaxed pt-2">
                Komplexní správa zakázek, kalkulace rozpočtů, harmonogram výjezdů řemeslníků a klientský portál.
              </p>
            </div>
          </div>

          <div className="space-y-3 z-10 my-6">
            <div className="flex gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: palette.primarySubtle, color: palette.primary }}
              >
                <Layout className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Vyhrazený firemní prostor</p>
                <p className="text-[11px] text-slate-400">Bezpečně izolovaná data organizace {activeCompanyName}.</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Šifrovaný přístup</p>
                <p className="text-[11px] text-slate-400">Ověřené role pro majitele, dispečery a montážní party.</p>
              </div>
            </div>
          </div>

          {/* Quick role fill shortcuts */}
          <div className="z-10 pt-4 border-t border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 font-mono">
              Rychlé přihlášení dle role:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickLogin('majitel@firma.cz', 'demo123')}
                className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                title="Majitel firmy"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Majitel CRM</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('zamestnanec@firma.cz', 'zam123')}
                className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                title="Mistr / Zaměstnanec"
              >
                <HardHat className="w-3.5 h-3.5 text-blue-400" />
                <span>Zaměstnanec</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Form */}
        <div className="md:col-span-7 p-10 flex flex-col justify-center bg-slate-900 relative">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">
                {mode === 'login' ? `Vítejte v CRM ${activeCompanyName}` : 'Registrace nové firmy'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {mode === 'login' 
                  ? `Zadejte své přihlašovací údaje pro vstup do portálu ${activeCompanyName}.` 
                  : 'Vytvořte si nový izolovaný firemní prostor s vlastní identitou.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold animate-in fade-in">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-semibold leading-relaxed space-y-1">
                  <p className="font-bold text-emerald-200">✓ Registrace byla úspěšná!</p>
                  <p className="text-emerald-300">{successMessage}</p>
                </div>
              )}

              {contextError && !error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
                  {contextError}
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block">Název vaší firmy</label>
                    <div className="mt-1 relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <Building className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 outline-none transition-colors"
                        style={{ borderColor: orgName ? palette.primaryBorder : undefined }}
                        placeholder="Např. Stavební pergoly s.r.o."
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block">Hlavní barva značky</label>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="relative w-12 h-10 border border-slate-800 rounded-xl overflow-hidden shrink-0 shadow-sm">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150 bg-transparent"
                        />
                      </div>
                      <span className="font-mono text-xs font-bold" style={{ color: primaryColor }}>{primaryColor}</span>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block">E-mailová adresa</label>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 outline-none transition-colors focus:border-slate-600"
                    placeholder="jmeno@firma.cz"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block">Heslo</label>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 outline-none transition-colors focus:border-slate-600"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-6 active:scale-[0.99]"
                style={{
                  backgroundColor: palette.primary,
                  color: palette.textOnPrimary,
                  boxShadow: palette.primaryGlow
                }}
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{mode === 'login' ? `Vstoupit do CRM ${activeCompanyName}` : 'Vytvořit firmu & Spustit'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-4 text-xs text-slate-400 font-medium">
              {mode === 'login' ? (
                <>
                  Chcete registrovat novou firmu?{' '}
                  <button 
                    onClick={() => setMode('signup')} 
                    className="font-bold hover:underline"
                    style={{ color: palette.primary }}
                  >
                    Založit firemní prostor
                  </button>
                </>
              ) : (
                <>
                  Již máte u nás účet?{' '}
                  <button 
                    onClick={() => setMode('login')} 
                    className="font-bold hover:underline"
                    style={{ color: palette.primary }}
                  >
                    Přihlásit se do účtu
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

