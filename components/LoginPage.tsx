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
    <div id="login-page-container" className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans text-slate-800">
      {/* Decorative dynamic company background mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>
      
      <div className="relative w-full max-w-[1200px] bg-white border border-slate-200 rounded-[24px] shadow-xl overflow-hidden grid md:grid-cols-2 min-h-[620px] z-10 animate-in fade-in duration-300">
        
        {/* Left column: Branded visual info card */}
        <div className="p-10 flex flex-col justify-between relative overflow-hidden bg-slate-50/50 border-r border-slate-200">
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
            
            <div className="space-y-4">
              {/* Company Logo in Hero */}
              <div className="flex items-center gap-3">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: palette.primary,
                    color: palette.textOnPrimary,
                  }}
                >
                  {activeLogo ? (
                    <img src={activeLogo} alt={activeCompanyName} className="w-full h-full object-cover bg-white" />
                  ) : (
                    activeCompanyName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight leading-tight text-slate-900">
                    {activeCompanyName}
                  </h1>
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: palette.primary }}></span>
                    {activeCity} • Operační systém
                  </p>
                </div>
              </div>
              
              <p className="text-base text-slate-600 font-medium leading-relaxed pt-2 max-w-md">
                Komplexní správa zakázek, kalkulace rozpočtů, harmonogram výjezdů řemeslníků a klientský portál v jednotném prostředí.
              </p>
            </div>
          </div>

          <div className="space-y-3 z-10 my-8">
            <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: palette.primarySubtle, color: palette.primary }}
              >
                <Layout className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Vyhrazený firemní prostor</p>
                <p className="text-xs text-slate-500 mt-0.5">Bezpečně izolovaná data organizace {activeCompanyName}.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Šifrovaný přístup</p>
                <p className="text-xs text-slate-500 mt-0.5">Ověřené role pro majitele, dispečery a montážní party.</p>
              </div>
            </div>
          </div>

          {/* Quick role fill shortcuts */}
          <div className="z-10 pt-6 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-3">
              Rychlé přihlášení dle role:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillQuickLogin('majitel@firma.cz', 'demo123')}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
                title="Majitel firmy"
              >
                <UserCheck className="w-4 h-4 text-green-600" />
                <span>Majitel CRM</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickLogin('zamestnanec@firma.cz', 'zam123')}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
                title="Mistr / Zaměstnanec"
              >
                <HardHat className="w-4 h-4 text-blue-600" />
                <span>Zaměstnanec</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Form */}
        <div className="p-10 lg:p-14 flex flex-col justify-center bg-white relative">
          <div className="max-w-sm w-full mx-auto space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {mode === 'login' ? 'Přihlášení' : 'Registrace firmy'}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                {mode === 'login' 
                  ? `Zadejte své údaje pro vstup do portálu ${activeCompanyName}.` 
                  : 'Vytvořte si nový izolovaný firemní prostor s vlastní identitou.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-start gap-2 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-xs font-bold leading-relaxed space-y-1">
                  <p className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Registrace byla úspěšná!</p>
                  <p className="text-green-600 font-medium">{successMessage}</p>
                </div>
              )}

              {contextError && !error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold">
                  {contextError}
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">Název vaší firmy</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                        <Building className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                        placeholder="Např. Stavební pergoly s.r.o."
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">Hlavní barva značky</label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-sm">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150 bg-transparent"
                        />
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-900">{primaryColor}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">E-mailová adresa</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                      placeholder="jmeno@firma.cz"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">Heslo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] mt-6"
                style={{
                  backgroundColor: palette.primary,
                  color: palette.textOnPrimary,
                }}
              >
                {isLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{mode === 'login' ? `Vstoupit do CRM` : 'Vytvořit firmu & Spustit'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-6 text-sm text-slate-500 font-medium">
              {mode === 'login' ? (
                <>
                  Chcete registrovat novou firmu?{' '}
                  <button 
                    onClick={() => setMode('signup')} 
                    className="font-bold hover:underline transition-colors"
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
                    className="font-bold hover:underline transition-colors"
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

