import { useState, useEffect, useMemo, useContext } from 'react';
import { CompanyBranding } from '../types';
import { getCompanyBranding, saveCompanyBranding, resetCompanyBranding, applyBrandTheme } from '../lib/branding';
import { 
  generateBrandPalette, 
  getBrandStyles, 
  BrandPalette, 
  getBrandDNA, 
  BrandDNA, 
  detectBrandArchetype, 
  BrandArchetype,
  applyBrandToDOM
} from '../lib/brandingEngine';
import { LocalSupabaseMock, DEFAULT_DEMO_ORG_ID } from '../lib/supabase';

export { applyBrandTheme, getBrandDNA, detectBrandArchetype };
export type { BrandArchetype, BrandDNA, BrandPalette };

export function useBranding(explicitOrgId?: string) {
  // Determine effective organization ID
  const activeOrgId = explicitOrgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;

  const [currentOrgId, setCurrentOrgId] = useState<string>(activeOrgId);
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    const initial = getCompanyBranding(activeOrgId);
    return initial;
  });

  // Listen to organization change / custom branding events
  useEffect(() => {
    const targetOrgId = explicitOrgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
    setCurrentOrgId(targetOrgId);
    const loaded = getCompanyBranding(targetOrgId);
    setBranding(loaded);
  }, [explicitOrgId]);

  const archetype: BrandArchetype = useMemo(() => {
    const org = LocalSupabaseMock.getOrganizations().find(o => o.id === currentOrgId);
    if ((org as any)?.theme_style) {
      return (org as any).theme_style as BrandArchetype;
    }
    return detectBrandArchetype(branding.name, branding.services);
  }, [currentOrgId, branding.name, branding.services]);

  const palette: BrandPalette = useMemo(() => {
    const org = LocalSupabaseMock.getOrganizations().find(o => o.id === currentOrgId);
    return generateBrandPalette(
      branding.primaryColor || org?.primary_color || '#2563eb',
      (org as any)?.secondary_color,
      (org as any)?.accent_color
    );
  }, [currentOrgId, branding.primaryColor]);

  const brandDNA: BrandDNA = useMemo(() => {
    return getBrandDNA(archetype, palette.primary, branding.name || 'Stavební Firma');
  }, [archetype, palette.primary, branding.name]);

  const brandStyles = useMemo(() => {
    return getBrandStyles(palette);
  }, [palette]);

  // Apply to DOM whenever palette or branding changes
  useEffect(() => {
    applyBrandToDOM(palette, branding.name, branding.logoUrl);
  }, [palette, branding.name, branding.logoUrl]);

  // Listen to cross-component branding changes & tenant switches
  useEffect(() => {
    const handleBrandingChange = (e: any) => {
      const targetId = explicitOrgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
      if (!e.detail?.orgId || e.detail.orgId === targetId) {
        const updated = getCompanyBranding(targetId);
        setBranding(updated);
        setCurrentOrgId(targetId);
      }
    };

    const handleOrgSwitch = () => {
      const targetId = explicitOrgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
      setCurrentOrgId(targetId);
      const updated = getCompanyBranding(targetId);
      setBranding(updated);
    };

    window.addEventListener('brandingChanged', handleBrandingChange);
    window.addEventListener('organizationSwitched', handleOrgSwitch);
    window.addEventListener('storage', handleOrgSwitch);

    return () => {
      window.removeEventListener('brandingChanged', handleBrandingChange);
      window.removeEventListener('organizationSwitched', handleOrgSwitch);
      window.removeEventListener('storage', handleOrgSwitch);
    };
  }, [explicitOrgId]);

  const updateBranding = (newBranding: Partial<CompanyBranding> | CompanyBranding) => {
    const targetId = currentOrgId || DEFAULT_DEMO_ORG_ID;
    const merged = { ...branding, ...newBranding } as CompanyBranding;
    saveCompanyBranding(merged, targetId);
    setBranding(merged);
  };

  const resetToDefault = () => {
    const targetId = currentOrgId || DEFAULT_DEMO_ORG_ID;
    const def = resetCompanyBranding(targetId);
    setBranding(def);
  };

  return { 
    branding, 
    updateBranding, 
    resetToDefault, 
    palette, 
    brandStyles, 
    brandDNA,
    archetype,
    currentOrgId 
  };
}
