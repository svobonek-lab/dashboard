import type { CompanyBranding } from '../model';
import { crmRepo } from '../../../shared/api/crm-repository';

export const getBranding = (orgId: string): Promise<CompanyBranding> => crmRepo.getBranding(orgId);
export const saveBranding = (orgId: string, branding: CompanyBranding): Promise<void> => crmRepo.saveBranding(orgId, branding);
