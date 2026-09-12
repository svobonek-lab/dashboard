import { CompanyBranding } from '../types';
import defaultCompany from '../branding/company.json';
import { generateBrandPalette, applyBrandToDOM, BrandPalette, BrandDNA, getBrandDNA, detectBrandArchetype } from './brandingEngine';
import { LocalSupabaseMock, DEFAULT_DEMO_ORG_ID } from './supabase';

export function getOrgStorageKey(orgId?: string): string {
  const targetId = orgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
  return `demofactory_branding_${targetId}`;
}

/**
 * Dynamically injects complete brand palette into root CSS variables, title, and favicon.
 */
export function applyBrandTheme(branding?: Partial<CompanyBranding>, secondaryColor?: string, accentColor?: string): BrandPalette {
  const primary = branding?.primaryColor || '#2563eb';
  const palette = generateBrandPalette(primary, secondaryColor, accentColor);
  applyBrandToDOM(palette, branding?.name, branding?.logoUrl);
  return palette;
}

/**
 * Gets branding for a specific organization ID, never leaking across tenants
 */
export function getCompanyBranding(orgId?: string): CompanyBranding {
  const targetId = orgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
  const key = `demofactory_branding_${targetId}`;
  
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load branding from storage', e);
  }

  // Fallback to company_settings for this specific orgId
  const orgSettings = LocalSupabaseMock.getCompanySettings(targetId) as any;
  if (orgSettings?.branding) {
    return orgSettings.branding as CompanyBranding;
  }

  // Fallback to organization record
  const org = LocalSupabaseMock.getOrganizations().find(o => o.id === targetId);
  if (org) {
    return {
      name: org.name,
      primaryColor: org.primary_color || '#2563eb',
      phone: org.phone || '+420 777 000 111',
      email: org.email || 'info@firma.cz',
      city: org.city || 'Praha',
      address: org.address || 'Česká republika',
      services: ['Stavební práce', 'Montáže', 'Rekonstrukce'],
      logoUrl: org.logo_url,
      website: org.website
    };
  }

  const fallback = defaultCompany as CompanyBranding;
  return fallback;
}

/**
 * Saves branding strictly for a specific organization ID
 */
export function saveCompanyBranding(branding: CompanyBranding, orgId?: string): void {
  const targetId = orgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
  const key = `demofactory_branding_${targetId}`;

  try {
    localStorage.setItem(key, JSON.stringify(branding));
    
    // Also sync back to LocalSupabaseMock company settings for isolation integrity
    const allSettings = LocalSupabaseMock.getCompanySettings() as any[];
    const idx = allSettings.findIndex(s => s.organization_id === targetId);
    if (idx >= 0) {
      allSettings[idx] = {
        ...allSettings[idx],
        branding: { ...allSettings[idx].branding, ...branding },
        primary_color: branding.primaryColor || allSettings[idx].primary_color
      };
      LocalSupabaseMock.saveCompanySettings(allSettings);
    }

    // Also sync primary_color / name to organizations table
    const allOrgs = LocalSupabaseMock.getOrganizations();
    const orgIdx = allOrgs.findIndex(o => o.id === targetId);
    if (orgIdx >= 0) {
      allOrgs[orgIdx] = {
        ...allOrgs[orgIdx],
        name: branding.name || allOrgs[orgIdx].name,
        primary_color: branding.primaryColor || allOrgs[orgIdx].primary_color,
        logo_url: branding.logoUrl || allOrgs[orgIdx].logo_url,
        phone: branding.phone || allOrgs[orgIdx].phone,
        email: branding.email || allOrgs[orgIdx].email,
        city: branding.city || allOrgs[orgIdx].city,
        address: branding.address || allOrgs[orgIdx].address,
        website: branding.website || allOrgs[orgIdx].website
      };
      LocalSupabaseMock.saveOrganizations(allOrgs);
    }

    applyBrandTheme(branding);
    // Dispatch tenant-specific event
    window.dispatchEvent(new CustomEvent('brandingChanged', { detail: { orgId: targetId } }));
  } catch (e) {
    console.error('Failed to save branding to storage', e);
  }
}

/**
 * Resets branding for a specific organization to its initial template
 */
export function resetCompanyBranding(orgId?: string): CompanyBranding {
  const targetId = orgId || LocalSupabaseMock.getActiveOrgId() || DEFAULT_DEMO_ORG_ID;
  const key = `demofactory_branding_${targetId}`;

  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to remove branding from storage', e);
  }

  const org = LocalSupabaseMock.getOrganizations().find(o => o.id === targetId);
  const fallback: CompanyBranding = org ? {
    name: org.name,
    primaryColor: org.primary_color || '#2563eb',
    phone: org.phone || '+420 777 000 111',
    email: org.email || 'info@firma.cz',
    city: org.city || 'Praha',
    address: org.address || 'Česká republika',
    services: ['Stavební práce', 'Montáže', 'Rekonstrukce'],
    logoUrl: org.logo_url,
    website: org.website
  } : (defaultCompany as CompanyBranding);

  applyBrandTheme(fallback);
  window.dispatchEvent(new CustomEvent('brandingChanged', { detail: { orgId: targetId } }));
  return fallback;
}
