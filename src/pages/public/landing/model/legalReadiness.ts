export type LegalIdentityEnv = {
  DEV?: unknown;
  VITE_COMPANY_NAME?: string;
  VITE_COMPANY_ICO?: string;
  VITE_COMPANY_ADDRESS?: string;
  VITE_COMPANY_EMAIL?: string;
};

export type LegalIdentityReadiness = {
  ready: boolean;
  missing: Array<'VITE_COMPANY_NAME' | 'VITE_COMPANY_ICO' | 'VITE_COMPANY_ADDRESS' | 'VITE_COMPANY_EMAIL'>;
  showDevelopmentWarning: boolean;
};

export function getLegalIdentityReadiness(env: LegalIdentityEnv): LegalIdentityReadiness {
  const required = [
    ['VITE_COMPANY_NAME', env.VITE_COMPANY_NAME],
    ['VITE_COMPANY_ICO', env.VITE_COMPANY_ICO],
    ['VITE_COMPANY_ADDRESS', env.VITE_COMPANY_ADDRESS],
    ['VITE_COMPANY_EMAIL', env.VITE_COMPANY_EMAIL],
  ] as const;
  const missing = required
    .filter(([name, value]) => {
      const normalized = String(value ?? '').trim();
      if (!normalized) return true;
      return name === 'VITE_COMPANY_EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    })
    .map(([name]) => name);
  return {
    ready: missing.length === 0,
    missing,
    showDevelopmentWarning: env.DEV === true && missing.length > 0,
  };
}
