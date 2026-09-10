import { CompanyBranding } from '../types';
import defaultCompany from '../branding/company.json';

const STORAGE_KEY = 'demofactory_current_company';

export function getCompanyBranding(): CompanyBranding {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load branding from storage', e);
  }
  return defaultCompany as CompanyBranding;
}

export function saveCompanyBranding(branding: CompanyBranding): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    // Trigger storage event or custom event for react hooks
    window.dispatchEvent(new Event('brandingChanged'));
  } catch (e) {
    console.error('Failed to save branding to storage', e);
  }
}
