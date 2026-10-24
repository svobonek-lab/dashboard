import React, { useState } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { Building, Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert, Building2, BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import type { UserRole } from '@/src/app/permissions';
import { supabase } from '@/lib/supabase';
import { buildRecoveryRequest, parseRecoveryResponse, validateNewPassword } from '@/src/app/authRecovery';
import { createOwnerLegalConsent } from '@/src/app/legalConsent';
import { LegalConsentFields } from './LegalConsentFields';

interface LoginPageProps {
  onSuccess: (user?: any) => void;
  expectedRole?: UserRole;
}

const ROLE_COPY: Record<UserRole, { title: string; description: string; route: string }> = {
  platform_admin: {
    title: 'Přihlášení administrátora',
    description: 'Správa firem, tarifů a nastavení platformy StavbaFlow.',
    route: '/admin/login',
  },
  owner: {
    title: 'Přihlášení majitele firmy',
    description: 'Přehled zakázek, poptávek, týmu a výkonu vaší firmy.',
    route: '/owner/login',
  },
  employee: {
    title: 'Přihlášení zaměstnance',
    description: 'Vaše přiřazené zakázky, termíny, checklisty a komunikace.',
    route: '/employee/login',
  },
};

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, expectedRole }) => {
  const {
    currentOrg,
    user,
    isConfigured,
    login,
    logout,
    signUp,
    invitePasswordRequired,
    completeInvitePasswordSetup,
    error: contextError,
  } = useOrganization();
  const branding = currentOrg?.branding || {};
  
  const [mode, setMode] = useState<'login' | 'signup' | 'recover' | 'new_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('var(--brand-primary)');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dpaAccepted, setDpaAccepted] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('inviteToken') || params.get('token');
    const emailParam = params.get('email');
    if (token) setInviteToken(token);
    if (emailParam) setEmail(emailParam);
    const { data } = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('new_password');
        setSuccessMessage('Odkaz je ověřený. Nastavte si nové heslo.');
      }
    }) || { data: null };
    return () => data?.subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (invitePasswordRequired) {
      setMode('new_password');
      setError(null);
      setSuccessMessage('Pozvánka je ověřená. Nejdříve si nastavte vlastní heslo.');
    }
  }, [invitePasswordRequired]);

  const activeCompanyName = currentOrg?.name || branding.name || 'Vaše Stavební Firma';
  const displayBrandColor = mode === 'signup' && primaryColor !== 'var(--brand-primary)' ? primaryColor : 'var(--brand-primary)';
  const displayOrgName = mode === 'signup' && orgName ? orgName : activeCompanyName;
  const roleCopy = expectedRole ? ROLE_COPY[expectedRole] : null;
  const ownerInviteActivation = mode === 'new_password' && invitePasswordRequired && user?.user_metadata?.role === 'owner';
  const legalConsentRequired = mode === 'signup' || ownerInviteActivation;
  const canSubmitLegalConsent = !legalConsentRequired || (termsAccepted && dpaAccepted);
  const collectOwnerLegalConsent = () => {
    if (!termsAccepted || !dpaAccepted) throw new Error('Potvr�te pros�m Obchodn� podm�nky i Zpracovatelskou smlouvu.');
    return createOwnerLegalConsent();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'recover') {
        const response = await fetch('/api/reset-employee-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRecoveryRequest(email)),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'Odkaz pro obnovu se nepodařilo odeslat.');
        setSuccessMessage(parseRecoveryResponse(result));
      } else if (mode === 'new_password') {
        const validatedPassword = validateNewPassword(password);
        if (invitePasswordRequired) {
          const activatedUser = await completeInvitePasswordSetup(validatedPassword, ownerInviteActivation ? collectOwnerLegalConsent() : undefined);
          setPassword('');
          onSuccess(activatedUser);
        } else {
          if (!supabase) throw new Error('Obnova hesla není na tomto prostředí dostupná.');
          const { error: updateError } = await supabase.auth.updateUser({ password: validatedPassword });
          if (updateError) throw updateError;
          setSuccessMessage('Heslo bylo změněno. Nyní se můžete přihlásit.');
          setPassword('');
          setMode('login');
        }
      } else if (mode === 'login') {
        const user = await login(email, password);
        if (expectedRole && user?.role !== expectedRole) {
          await logout();
          throw new Error('Tento účet nemá oprávnění pro zvolený typ dashboardu. Přihlaste se přes správný vstup.');
        }
        onSuccess(user);
      } else {
        await signUp(email, password, orgName, collectOwnerLegalConsent());
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

  return (
    <div className="min-h-screen bg-surface-secondary flex font-sans">
      <aside className="login-value-panel hidden lg:flex">
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100"><ShieldCheck className="h-4 w-4" /> Ověřený firemní pilot</div>
          <p className="mt-8 text-sm font-semibold text-blue-200">StavbaFlow</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.04em] text-white">Zakázky, tým a další krok. Bez zbytečného chaosu.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Jednoduchý pracovní prostor pro menší stavební firmu. Každý vidí jen to, co potřebuje ke své práci.</p>
          <div className="mt-10 space-y-3">
            {[
              { icon: Building2, title: 'Jedno přihlášení, správný dashboard', text: 'Majitele i zaměstnance systém automaticky pošle do jejich pracovního prostoru.' },
              { icon: BriefcaseBusiness, title: 'Poptávka až po realizaci', text: 'Stav zakázky, přiřazení a historie zůstávají na jednom místě.' },
              { icon: ShieldCheck, title: 'Data firmy zůstávají oddělená', text: 'Přístup vynucuje role uživatele a příslušnost k firmě.' },
            ].map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200"><Icon className="h-5 w-5" /></span><span><strong className="block text-sm font-semibold text-white">{title}</strong><small className="mt-1 block text-sm leading-5 text-slate-300">{text}</small></span></div>)}
          </div>
        </div>
      </aside>

      {/* Right Login/Signup Form Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-5 sm:p-8 bg-surface-secondary">
         <div className="max-w-md w-full bg-surface border border-border p-7 sm:p-10 rounded-[24px] shadow-app">
            
            <div className="text-center mb-8">
              <div 
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-md text-white font-black text-2xl transition-colors duration-300"
                style={{ backgroundColor: displayBrandColor }}
              >
                 {displayOrgName.substring(0, 2).toUpperCase()}
              </div>
              <h2 className="text-2xl font-black text-text tracking-tight">
                {mode === 'login'
                  ? (roleCopy?.title || 'Přihlášení do StavbaFlow')
                  : mode === 'signup'
                    ? 'Vytvořit firemní workspace'
                    : mode === 'recover'
                      ? 'Obnovit heslo'
                      : invitePasswordRequired ? 'Nastavte si heslo' : 'Nastavit nové heslo'}
              </h2>
              <p className="text-sm text-muted font-medium mt-2">
                {mode === 'login' 
                  ? (roleCopy?.description || 'Po přihlášení vás StavbaFlow automaticky pošle do dashboardu podle vaší role.')
                  : mode === 'signup'
                    ? 'Vytvořte si vlastní oddělený prostor (tenant) na platformě.'
                    : mode === 'recover'
                      ? 'Pošleme vám jednorázový odkaz na ověřený e-mail účtu.'
                      : invitePasswordRequired
                        ? 'Bez vlastního hesla se pozvánka neaktivuje a dashboard zůstane uzamčený.'
                        : 'Nové heslo se uloží pouze do vašeho ověřeného účtu.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {(inviteToken || invitePasswordRequired) && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-app text-xs font-semibold leading-relaxed space-y-1">
                  <p className="flex items-center gap-1.5 font-bold text-amber-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" /> Pozvánka do StavbaFlow
                  </p>
                  <p className="text-amber-700">
                    Byli jste pozváni do týmu <strong>{displayOrgName}</strong>. Nastavte si vlastní heslo pro dokončení aktivace účtu.
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
                  <p className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Ověřený krok</p>
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

              {legalConsentRequired && <LegalConsentFields termsAccepted={termsAccepted} dpaAccepted={dpaAccepted} onTermsAcceptedChange={setTermsAccepted} onDpaAcceptedChange={setDpaAccepted} />}

              <div className="space-y-4">
                {mode !== 'new_password' && (
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
                )}
                {mode !== 'recover' && (
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
                )}
              </div>

              {mode === 'login' && (
                <div className="text-right -mt-2">
                  <button type="button" onClick={() => { setMode('recover'); setError(null); setSuccessMessage(null); }} className="text-xs font-bold text-brand-primary hover:underline">
                    Zapomenuté heslo
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !canSubmitLegalConsent}
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
                    <span>{mode === 'login' ? 'Pokračovat do workspace' : mode === 'signup' ? 'Vytvořit firmu & Spustit' : mode === 'recover' ? 'Odeslat bezpečný odkaz' : invitePasswordRequired ? 'Nastavit heslo a pokračovat' : 'Uložit nové heslo'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-6 text-sm text-muted font-medium">
              {mode === 'login' && !isConfigured ? (
                <>
                  Nemáte firemní prostor?{' '}
                  <button 
                    onClick={() => { setMode('signup'); setTermsAccepted(false); setDpaAccepted(false); }}
                    className="font-bold hover:underline transition-colors"
                    style={{ color: displayBrandColor }}
                  >
                    Založit nový workspace
                  </button>
                </>
              ) : mode === 'login' ? (
                <span className="text-xs leading-5">{import.meta.env.VITE_PAID_REGISTRATION_ENABLED === 'true' ? <a href="/register-paid" className="font-semibold underline">Založit firemní workspace</a> : 'Firemní prostor připravujeme při onboardingu. Přístup obdržíte od správce StavbaFlow.'}</span>
              ) : mode === 'signup' ? (
                <>
                  Již máte u nás účet?{' '}
                  <button 
                    onClick={() => { setMode('login'); setTermsAccepted(false); setDpaAccepted(false); }}
                    className="font-bold hover:underline transition-colors"
                    style={{ color: displayBrandColor }}
                  >
                    Přihlásit se
                  </button>
                </>
              ) : mode === 'new_password' && invitePasswordRequired ? (
                <span className="text-xs leading-5">Po nastavení hesla vás automaticky otevřeme ve správném dashboardu.</span>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                  className="font-bold hover:underline transition-colors"
                  style={{ color: displayBrandColor }}
                >
                  Zpět na přihlášení
                </button>
              )}
            </div>
         </div>
      </div>
    </div>
  );
};
