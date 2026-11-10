import React, { useState } from 'react';
import { useOrganization } from '@/entities/session';
import { Building, Building2, BriefcaseBusiness, Lock, Mail, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { UserRole } from '@/shared/model/permissions';
import { supabase } from '@/shared/api/supabase';
import { buildRecoveryRequest, getRecoveryErrorMessage, parseRecoveryResponse, validateNewPassword } from '@/features/login';
import { createOwnerLegalConsent } from '@/shared/model/legalConsent';
import { LegalConsentFields } from '@/shared/ui/LegalConsentFields';
import { normalizePublicOrigin } from '@/shared/lib/publicUrls';

const PUBLIC_LANDING_URL = normalizePublicOrigin(import.meta.env.PUBLIC_LANDING_URL, Boolean(import.meta.env.DEV));

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
    description: 'Přístup k poptávkám, zakázkám a týmu vaší firmy.',
    route: '/owner/login',
  },
  employee: {
    title: 'Přihlášení zaměstnance',
    description: 'Přístup k vašim přiděleným zakázkám.',
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
        const recoveryRequest = buildRecoveryRequest(email);
        const response = await fetch('/api/reset-employee-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recoveryRequest),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          setError(getRecoveryErrorMessage(result));
          return;
        }
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
      if (mode === 'recover') {
        setError(err?.message === 'Zadejte platný e-mail.' ? err.message : getRecoveryErrorMessage(null));
      } else {
        setError(err.message || 'Neznámá chyba');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-layout min-h-screen font-sans lg:grid lg:grid-cols-[minmax(360px,44%)_minmax(0,1fr)]">
      <aside className="auth-value-panel hidden lg:flex" aria-label="StavbaFlow pro stavební firmy">
        <div className="relative z-10 flex h-full w-full max-w-xl flex-col">
          <div className="flex items-center gap-3 text-white">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-blue-500 text-sm font-bold">SF</span>
            <span className="text-lg font-semibold tracking-tight">StavbaFlow</span>
          </div>
          <div className="my-auto py-12">
            <p className="text-sm font-medium text-blue-200">Pracovní prostor pro stavební firmy</p>
            <h2 className="mt-5 max-w-lg text-[clamp(2.5rem,4vw,4rem)] font-semibold leading-[1.08] tracking-[-0.055em] text-white">Zakázky a tým v jednom přehledu.</h2>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">Poptávka, odpovědný člověk a další krok zůstávají v jednom přehledu.</p>
            <div className="auth-workflow mt-10" aria-label="Práce v aplikaci">
              <div className="auth-workflow-row"><Building2 aria-hidden="true" className="h-5 w-5" /><span><strong>Firma</strong><small>Vlastní pracovní prostor a tým</small></span></div>
              <div className="auth-workflow-row"><BriefcaseBusiness aria-hidden="true" className="h-5 w-5" /><span><strong>Zakázky</strong><small>Poptávky, přiřazení a stav práce</small></span></div>
              <div className="auth-workflow-row"><ShieldCheck aria-hidden="true" className="h-5 w-5" /><span><strong>Přístup</strong><small>Majitel a zaměstnanec vidí svou práci</small></span></div>
            </div>
          </div>
          <p className="text-sm text-slate-400">StavbaFlow, pro menší stavební firmy</p>
        </div>
      </aside>
      <div className="auth-form-side flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="w-full max-w-[28rem]">
        <div className="auth-form-brand mb-6 flex items-center gap-3 lg:hidden">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-[#2563EB] text-sm font-bold text-white">SF</span>
          <span className="text-lg font-semibold tracking-tight text-text">StavbaFlow</span>
        </div>
        <div className="auth-card rounded-xl border border-border bg-surface p-5 sm:p-8">
            <div className="mb-7">
              <h1 className="text-2xl font-semibold tracking-tight text-text">
                {mode === 'login'
                  ? (roleCopy?.title || 'Přihlášení do StavbaFlow')
                  : mode === 'signup'
                    ? 'Založit firemní účet'
                    : mode === 'recover'
                      ? 'Obnovit heslo'
                      : invitePasswordRequired ? 'Nastavte si heslo' : 'Nastavit nové heslo'}
              </h1>
              <p className="text-sm text-muted font-medium mt-2">
                {mode === 'login'
                  ? (roleCopy?.description || 'Použijte e-mail, který máte u svého účtu.')
                  : mode === 'signup'
                    ? 'Zadejte údaje pro založení firemního účtu.'
                    : mode === 'recover'
                      ? 'Pošleme vám jednorázový odkaz na ověřený e-mail účtu.'
                      : invitePasswordRequired
                        ? 'Nastavením hesla dokončíte přijetí pozvánky.'
                        : 'Zadejte nové heslo pro svůj účet.'}
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
                <div role="alert" className="auth-message auth-message-error p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-app text-sm font-semibold flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {successMessage && (
                <div role="status" aria-live="polite" className="auth-message auth-message-success p-4 bg-green-50 border border-green-200 text-green-800 rounded-app text-sm font-semibold leading-relaxed space-y-1">
                  <p className="text-green-600 font-medium">{successMessage}</p>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-muted block mb-1.5">Název vaší firmy</label>
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
                    <label className="text-xs font-bold text-muted block mb-1.5">Hlavní barva značky</label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 border border-border rounded-app overflow-hidden shrink-0 shadow-sm">
                        <input
                          type="color"
                          value={primaryColor === 'var(--brand-primary)' ? '#2563eb' : primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150 bg-transparent"
                        />
                      </div>
                      <span className="text-sm font-bold text-text">{primaryColor === 'var(--brand-primary)' ? '#2563eb' : primaryColor}</span>
                    </div>
                  </div>
                </div>
              )}

              {legalConsentRequired && <LegalConsentFields termsAccepted={termsAccepted} dpaAccepted={dpaAccepted} onTermsAcceptedChange={setTermsAccepted} onDpaAcceptedChange={setDpaAccepted} />}

              <div className="space-y-4">
                {mode !== 'new_password' && (
                <div>
                  <label htmlFor="auth-email" className="text-sm font-semibold text-text block mb-1.5">E-mail</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted">
                      <Mail className="w-4 h-4" />
                    </span>
                      <input
                      type="email"
                        id="auth-email"
                        autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                        className="w-full min-h-12 pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-control text-base font-medium text-text focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                      style={{ '--tw-ring-color': displayBrandColor } as React.CSSProperties}
                      placeholder="jmeno@firma.cz"
                      required
                    />
                  </div>
                </div>
                )}
                {mode !== 'recover' && (
                <div>
                  <label htmlFor="auth-password" className="text-sm font-semibold text-text block mb-1.5">{mode === 'new_password' ? 'Nové heslo' : 'Heslo'}</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-muted">
                      <Lock className="w-4 h-4" />
                    </span>
                      <input
                      type="password"
                        id="auth-password"
                        autoComplete={mode === 'new_password' ? 'new-password' : 'current-password'}
                        minLength={mode === 'new_password' ? 10 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                        className="w-full min-h-12 pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-control text-base font-medium text-text focus:outline-none focus:ring-2 focus:border-transparent transition-all"
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
                  <button type="button" onClick={() => { setMode('recover'); setError(null); setSuccessMessage(null); }} className="min-h-11 px-2 text-sm font-semibold text-brand-primary hover:underline">
                    Zapomenuté heslo
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !canSubmitLegalConsent}
                className="w-full min-h-12 px-4 rounded-control text-sm font-semibold shadow-app transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] mt-4 cursor-pointer disabled:cursor-wait disabled:opacity-65"
                style={{
                  backgroundColor: displayBrandColor,
                  color: '#ffffff',
                }}
              >
                {isLoading ? (
                  <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Přihlásit se' : mode === 'signup' ? 'Založit firmu' : mode === 'recover' ? 'Odeslat bezpečný odkaz' : invitePasswordRequired ? 'Nastavit heslo a pokračovat' : 'Uložit nové heslo'}</span>

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
                    Založit firemní účet
                  </button>
                </>
              ) : mode === 'login' ? (
                <span className="text-xs leading-5">{import.meta.env.VITE_PAID_REGISTRATION_ENABLED === 'true' ? <a href="/register-paid" className="font-semibold underline">Založit firemní účet</a> : 'Přístup k firemnímu účtu vám připraví správce StavbaFlow.'}</span>
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
                <span className="text-xs leading-5">Po nastavení hesla se otevře přehled vaší práce.</span>
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
              {PUBLIC_LANDING_URL && <a href={`${PUBLIC_LANDING_URL}/`} className="mt-4 block text-xs font-semibold underline">Web StavbaFlow</a>}
            </div>
         </div>
      </div>
      </div>
    </main>
  );
};
