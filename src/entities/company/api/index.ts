import type { CompanyBranding } from '../model';
import { crmRepo } from '../../../shared/api/crm-repository';

export const getBranding = async (orgId: string): Promise<CompanyBranding> => await crmRepo.getBranding(orgId) as CompanyBranding;
export const saveBranding = (orgId: string, branding: CompanyBranding): Promise<void> => crmRepo.saveBranding(orgId, branding);
