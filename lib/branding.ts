import { CompanyBranding } from '../types';
import defaultCompany from '../branding/company.json';

const STORAGE_KEY = 'demofactory_current_company';

/**
 * Calculates a slightly darker hex color for hover states.
 */
function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Dynamically injects brand colors into root CSS variables for white-label look.
 */
export function applyBrandTheme(branding?: Partial<CompanyBranding>): void {
  if (typeof document === 'undefined') return;
  const primary = branding?.primaryColor || '#2563eb';
  const root = document.documentElement;

  const hoverColor = adjustBrightness(primary, -15);
  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-primary-hover', hoverColor);
  root.style.setProperty('--brand-primary-light', `${primary}15`);
  root.style.setProperty('--brand-primary-subtle', `${primary}10`);
  root.style.setProperty('--brand-primary-border', `${primary}35`);
  root.style.setProperty('--brand-primary-ring', `${primary}30`);
}

export function getCompanyBranding(): CompanyBranding {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      applyBrandTheme(parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load branding from storage', e);
  }
  const fallback = defaultCompany as CompanyBranding;
  applyBrandTheme(fallback);
  return fallback;
}

export function saveCompanyBranding(branding: CompanyBranding): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    applyBrandTheme(branding);
    // Trigger storage event or custom event for react hooks
    window.dispatchEvent(new Event('brandingChanged'));
  } catch (e) {
    console.error('Failed to save branding to storage', e);
  }
}

export function resetCompanyBranding(): CompanyBranding {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove branding from storage', e);
  }
  const fallback = defaultCompany as CompanyBranding;
  applyBrandTheme(fallback);
  window.dispatchEvent(new Event('brandingChanged'));
  return fallback;
}

