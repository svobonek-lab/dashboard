import { createContext, useContext } from 'react';
import type { Employee, Lead } from '../types';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  website?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  primary_color: string;
  secondary_color?: string;
  logo_url?: string;
  branding?: any;
  status?: string;
  created_at?: string;
  plan?: string;
}

export interface DBUser {
  id: string;
  organization_id: string;
  role: string;
  email?: string;
  name?: string;
}

export interface DBProject {
  id: string;
  organization_id: string;
  lead_id: string;
  assigned_employee: string;
  status: string;
}

export interface OrganizationContextType {
  isConfigured: boolean;
  user: any | null;
  dbUser: DBUser | null;
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
  schemaError: string | null;
  clearSchemaError: () => void;
  login: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, orgName: string) => Promise<any>;
  logout: () => Promise<void>;
  createOrganization: (name: string, primaryColor?: string) => Promise<Organization>;
  switchOrganization: (orgId: string) => Promise<void>;
  fetchLeads: () => Promise<Lead[]>;
  saveLead: (lead: Partial<Lead>) => Promise<Lead>;
  createLead: (lead: Partial<Lead>) => Promise<Lead>;
  updateLeadStatus: (leadId: string, status: string) => Promise<void>;
  fetchEmployees: () => Promise<Employee[]>;
  saveEmployee: (emp: Partial<Employee>) => Promise<Employee>;
  inviteEmployee: (emp: Partial<Employee>, tempPassword?: string) => Promise<Employee>;
  resendEmployeeInvite: (employeeId: string) => Promise<{ email: string; message: string }>;
  resetEmployeePassword: (employeeId: string) => Promise<{ email: string; message: string }>;
  deactivateEmployee: (employeeId: string, deactivate?: boolean) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  fetchProjects: () => Promise<DBProject[]>;
  saveProject: (project: Partial<DBProject>) => Promise<DBProject>;
  impersonatingOrgId: string | null;
  originalOrg: Organization | null;
  impersonateOrganization: (orgId: string) => Promise<void>;
  stopImpersonation: () => void;
  fetchAllOrganizationsAdmin: () => Promise<any[]>;
  deleteOrganizationAdmin: (orgId: string) => Promise<void>;
  updateBrandingAdmin: (orgId: string, name: string, color: string, logo?: string, profile?: Pick<Organization, 'email' | 'phone' | 'address'>) => Promise<void>;
  suspendOrganizationAdmin: (orgId: string, suspend: boolean) => Promise<void>;
  createCustomerAdmin: (data: {
    name: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo_url?: string;
    primary_color: string;
    secondary_color?: string;
    address?: string;
    owner_name?: string;
    owner_email?: string;
    owner_password?: string;
    services?: string[];
    employees?: Array<{ name: string; specialization?: string; role?: string; phone?: string; email?: string; capacity?: number }>;
    onStepProgress?: (step: number, message: string) => void;
  }) => Promise<{
    orgId: string;
    ownerEmail: string;
    ownerPassword?: string;
    crmUrl: string;
    portalUrl: string;
    formUrl: string;
    widgetScript: string;
  }>;
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used within an OrganizationProvider');
  return context;
};
