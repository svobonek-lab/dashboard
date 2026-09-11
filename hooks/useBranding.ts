import { useState, useEffect } from 'react';
import { CompanyBranding } from '../types';
import { getCompanyBranding, saveCompanyBranding, applyBrandTheme } from '../lib/branding';

export { applyBrandTheme };

export function useBranding() {
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    const initial = getCompanyBranding();
    applyBrandTheme(initial);
    return initial;
  });

  useEffect(() => {
    applyBrandTheme(branding);
  }, [branding]);

  useEffect(() => {
    const handleStorageChange = () => {
      const updated = getCompanyBranding();
      setBranding(updated);
      applyBrandTheme(updated);
    };

    window.addEventListener('brandingChanged', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('brandingChanged', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateBranding = (newBranding: Partial<CompanyBranding> | CompanyBranding) => {
    const merged = { ...branding, ...newBranding } as CompanyBranding;
    saveCompanyBranding(merged);
    setBranding(merged);
    applyBrandTheme(merged);
  };

  return { branding, updateBranding };
}
