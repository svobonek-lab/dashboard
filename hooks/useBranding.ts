import { useState, useEffect, useMemo } from 'react';
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
import { useOrganization } from '../context/OrganizationContext';

export { applyBrandTheme, getBrandDNA, detectBrandArchetype };
export type { BrandArchetype, BrandDNA, BrandPalette };

export function useBranding(explicitOrgId?: string) {
  // Read OrganizationContext via hook safely
  let orgCtx: any = null;
  try {
    orgCtx = useOrganization();
  } catch (e) {
    // Fallback if rendered outside OrganizationProvider
    orgCtx = null;
  }
  const currentOrg = orgCtx?.currentOrg;

  // Determine effective organization ID
  const activeOrgId = explicitOrgId || currentOrg?.id || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;

  const [currentOrgId, setCurrentOrgId] = useState<string>(activeOrgId);
  const [branding, setBranding] = useState<CompanyBranding>(() => {
    if (currentOrg?.branding) {
      return {
        ...getCompanyBranding(activeOrgId),
        name: currentOrg.name || currentOrg.branding.name,
        primaryColor: currentOrg.primary_color || currentOrg.branding.primaryColor || '#2563eb',
        ...currentOrg.branding
      };
    }
    return getCompanyBranding(activeOrgId);
  });

  // Sync whenever currentOrg or explicitOrgId changes
  useEffect(() => {
    const targetOrgId = explicitOrgId || currentOrg?.id || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
    setCurrentOrgId(targetOrgId);

    const loaded = getCompanyBranding(targetOrgId);
    if (currentOrg && currentOrg.id === targetOrgId) {
      setBranding({
        ...loaded,
        name: currentOrg.name || loaded.name,
        primaryColor: currentOrg.primary_color || loaded.primaryColor || '#2563eb',
        ...(currentOrg.branding || {})
      });
    } else {
      setBranding(loaded);
    }
  }, [explicitOrgId, currentOrg]);

  const archetype: BrandArchetype = useMemo(() => {
    if (currentOrg && (currentOrg as any).theme_style) {
      return (currentOrg as any).theme_style as BrandArchetype;
    }
    return detectBrandArchetype(branding.name, branding.services);
  }, [currentOrg, branding.name, branding.services]);

  const palette: BrandPalette = useMemo(() => {
    const primaryColor = currentOrg?.primary_color || branding.primaryColor || '#2563eb';
    return generateBrandPalette(
      primaryColor,
      (currentOrg as any)?.secondary_color,
      (currentOrg as any)?.accent_color
    );
  }, [currentOrg?.primary_color, branding.primaryColor]);

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

  const updateBranding = (newBranding: Partial<CompanyBranding> | CompanyBranding) => {
    const targetId = currentOrgId || DEFAULT_DEMO_ORG_ID;
    const merged = { ...branding, ...newBranding } as CompanyBranding;
    saveCompanyBranding(merged, targetId);
    setBranding(merged);
    if (orgCtx?.updateBrandingAdmin && currentOrg) {
      orgCtx.updateBrandingAdmin(targetId, {
        name: merged.name,
        primary_color: merged.primaryColor,
        branding: merged
      }).catch(console.error);
    }
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

