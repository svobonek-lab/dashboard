import { useState, useEffect } from 'react';
import { CompanyBranding } from '../types';
import { getCompanyBranding, saveCompanyBranding } from '../lib/branding';

export function useBranding() {
  const [branding, setBranding] = useState<CompanyBranding>(getCompanyBranding());

  useEffect(() => {
    const handleStorageChange = () => {
      setBranding(getCompanyBranding());
    };

    window.addEventListener('brandingChanged', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('brandingChanged', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateBranding = (newBranding: CompanyBranding) => {
    saveCompanyBranding(newBranding);
    setBranding(newBranding);
  };

  return { branding, updateBranding };
}
