import { Lead, Employee, CompanyBranding } from '../../types';

export type StorageMode = 'cloud' | 'synology' | 'local';

export interface RepositoryHealthStatus {
  ok: boolean;
  latencyMs: number;
  mode: StorageMode;
  endpoint?: string;
  message?: string;
  lastChecked: string;
}

export interface ICRMRepository {
  readonly mode: StorageMode;
  
  // Health & diagnostics
  getHealthStatus(): Promise<RepositoryHealthStatus>;
  
  // Leads management
  getLeads(orgId: string): Promise<Lead[]>;
  saveLead(orgId: string, lead: Partial<Lead>): Promise<Lead>;
  updateLeadStatus(orgId: string, leadId: string, status: string): Promise<void>;
  deleteLead(orgId: string, leadId: string): Promise<void>;
  
  // Employees management
  getEmployees(orgId: string): Promise<Employee[]>;
  saveEmployee(orgId: string, employee: Partial<Employee>): Promise<Employee>;
  
  // Projects management
  getProjects(orgId: string): Promise<any[]>;
  saveProject(orgId: string, project: any): Promise<any>;
  
  // Branding & Configuration
  getBranding(orgId: string): Promise<CompanyBranding>;
  saveBranding(orgId: string, branding: CompanyBranding): Promise<void>;
}
