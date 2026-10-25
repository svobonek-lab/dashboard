export type DataRecord = Record<string, any>;
export type Lead = DataRecord;
export type Employee = DataRecord;
export type CompanyBranding = DataRecord;

export type StorageMode = 'cloud' | 'byodb';

export interface RepositoryHealthStatus {
  ok: boolean;
  latencyMs: number;
  mode: StorageMode;
  endpoint?: string;
  message?: string;
  lastChecked: string;
}

export interface LeadNote {
  id: string;
  companyId: string;
  leadId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface LeadStoredFile {
  id: string;
  companyId: string;
  leadId: string;
  authorId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  previewUrl: string;
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

  // Notes and private files. Implementations without the reviewed cloud
  // contract must fail closed instead of inventing local attachment data.
  getLeadNotes(orgId: string, leadId: string): Promise<LeadNote[]>;
  addLeadNote(orgId: string, leadId: string, body: string): Promise<LeadNote>;
  deleteLeadNote(orgId: string, noteId: string): Promise<void>;
  getLeadFiles(orgId: string, leadId: string): Promise<LeadStoredFile[]>;
  uploadLeadFile(orgId: string, leadId: string, file: File): Promise<LeadStoredFile>;
  deleteLeadFile(orgId: string, file: LeadStoredFile): Promise<void>;
  
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
