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
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signUp(email, password, orgName);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Chyba při přihlašování. Zkontrolujte prosím své údaje.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Decorative background grid and shapes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden grid md:grid-cols-12 min-h-[600px] z-10">
        {/* Left column: Branded visual info card */}
        <div className="md:col-span-5 bg-slate-900 text-white p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle grid on left */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          
          <div className="space-y-6 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-blue-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Tenant CRM v1.4</span>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight leading-tight">
                DemoFactory
              </h1>
              <p className="text-sm text-slate-400 font-medium">
                Profesionální klientský portál a systém pro správu stavebních poptávek, kalkulací a kapacit.
              </p>
            </div>
          </div>

          <div className="space-y-4 z-10 my-8">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Layout className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Multitenantní architektura</p>
                <p className="text-[11px] text-slate-400">Jedno nasazení, neomezený počet bezpečně izolovaných firem.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Supabase Integrace</p>
                <p className="text-[11px] text-slate-400">Reálné databázové dotazy, filtrace dat a uživatelská autentizace.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Bezpečné oddělení</p>
                <p className="text-[11px] text-slate-400">Každý dotaz je automaticky filtrován dle unikátního ID organizace.</p>
              </div>
            </div>
          </div>

          <div className="z-10 text-[11px] text-slate-500 font-medium flex items-center justify-between">
            <span>© {new Date().getFullYear()} DemoFactory</span>
            <span>Czech Craftsmanship</span>
          </div>
        </div>

        {/* Right column: Beautiful Form */}
        <div className="md:col-span-7 p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                {mode === 'login' ? 'Přihlášení k účtu' : 'Registrace nové firmy'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {mode === 'login' 
                  ? 'Zadejte své přihlašovací údaje pro přístup do firemního portálu.' 
                  : 'Vytvořte si nový izolovaný firemní prostor s vlastní identitou.'}
              </p>
            </div>

            {!isConfigured && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 leading-relaxed">
                <strong>Sandbox režim:</strong> Supabase není nakonfigurován v <code>.env</code>. Systém vám automaticky vytvoří virtuálního klienta a uloží vše lokálně do LocalStorage.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              {contextError && !error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold">
                  {contextError}
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block">Název vaší firmy</label>
                    <div className="mt-1 relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Building className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Např. Stavební pergoly s.r.o."
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block">Hlavní barva značky</label>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="relative w-12 h-10 border border-slate-200 rounded-xl overflow-hidden shrink-0">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-500 font-bold">{primaryColor}</span>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block">E-mailová adresa</label>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="jmeno@firma.cz"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block">Heslo</label>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-6"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Přihlásit se do CRM' : 'Vytvořit firmu & Spustit'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-4 text-xs text-slate-500 font-medium">
              {mode === 'login' ? (
                <>
                  Chcete registrovat novou firmu?{' '}
                  <button onClick={() => setMode('signup')} className="text-blue-600 font-bold hover:underline">
                    Založit firemní prostor
                  </button>
                </>
              ) : (
                <>
                  Již máte u nás účet?{' '}
                  <button onClick={() => setMode('login')} className="text-blue-600 font-bold hover:underline">
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
