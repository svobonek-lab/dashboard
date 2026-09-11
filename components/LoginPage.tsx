import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Database, Shield, Layout, Sparkles, Building, Lock, Mail, Palette, Wand2, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { isConfigured, login, signUp, error: contextError } = useOrganization();
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div id="login-page-container" className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans text-slate-100 selection:bg-amber-500/30">
      {/* Decorative background grid and shapes */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[32px] shadow-2xl overflow-hidden grid md:grid-cols-12 min-h-[600px] z-10">
        {/* Left column: Branded visual info card */}
        <div className="md:col-span-5 bg-slate-950 text-white p-12 flex flex-col justify-between relative overflow-hidden border-r border-slate-800">
          {/* Subtle grid on left */}
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-15"></div>
          
          <div className="space-y-6 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-semibold text-amber-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>StavbaCore ERP v1.4</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight leading-tight text-slate-100">
                StavbaCore <span className="text-amber-500">ERP</span>
              </h1>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                Profesionální B2B systém pro stavební firmy, řemesla, rozpočty a řízení realizací.
              </p>
            </div>
          </div>

          <div className="space-y-4 z-10 my-8">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Layout className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Multitenantní architektura</p>
                <p className="text-[11px] text-slate-400">Jedno nasazení, neomezený počet bezpečně izolovaných firem.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Bezpečná databáze</p>
                <p className="text-[11px] text-slate-400">Reálné databázové dotazy, filtrace dat a uživatelská autentizace.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Bezpečné oddělení dat</p>
                <p className="text-[11px] text-slate-400">Každý dotaz je automaticky filtrován dle unikátního ID organizace.</p>
              </div>
            </div>
          </div>

          <div className="z-10 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>© {new Date().getFullYear()} StavbaCore</span>
            <span>České stavební řemeslo</span>
          </div>
        </div>

        {/* Right column: Form */}
        <div className="md:col-span-7 p-12 flex flex-col justify-center bg-slate-900">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">
                {mode === 'login' ? 'Přihlášení k účtu' : 'Registrace nové firmy'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {mode === 'login' 
                  ? 'Zadejte své přihlašovací údaje pro přístup do stavebního portálu.' 
                  : 'Vytvořte si nový izolovaný firemní prostor s vlastní identitou.'}
              </p>
            </div>

            {!isConfigured && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-400">Lokální sandbox režim:</strong> Běží na lokálním úložišti, data jsou uchovávána bezpečně.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
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
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Building className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 focus:border-amber-500 outline-none"
                        placeholder="Např. Stavební pergoly s.r.o."
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block">Hlavní barva značky</label>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="relative w-12 h-10 border border-slate-800 rounded-xl overflow-hidden shrink-0">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150 bg-transparent"
                        />
                      </div>
                      <span className="font-mono text-xs text-amber-400 font-bold">{primaryColor}</span>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block">E-mailová adresa</label>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 focus:border-amber-500 outline-none"
                    placeholder="jmeno@firma.cz"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block">Heslo</label>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium text-slate-100 focus:border-amber-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Přihlásit se do systému' : 'Vytvořit firmu & Spustit'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-4 text-xs text-slate-400 font-medium">
              {mode === 'login' ? (
                <>
                  Chcete registrovat novou firmu?{' '}
                  <button onClick={() => setMode('signup')} className="text-amber-400 font-bold hover:underline">
                    Založit firemní prostor
                  </button>
                </>
              ) : (
                <>
                  Již máte u nás účet?{' '}
                  <button onClick={() => setMode('login')} className="text-amber-400 font-bold hover:underline">
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
