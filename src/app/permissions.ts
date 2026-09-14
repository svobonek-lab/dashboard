export type UserRole = 'super_admin' | 'owner' | 'employee';

export interface RolePermissions {
  canEditLeads: boolean;
  canDeleteLeads: boolean;
  canDeleteEmployees: boolean;
  canManageEmployees: boolean;
  canViewRevenue: boolean;
  canManageCompany: boolean;
  canAccessSuperAdmin: boolean;
  canAccessFieldTools: boolean;
  canViewTeamMembers: boolean;
  canGenerateQuotes: boolean;
  canAccessSettings: boolean;
  canAccessAnalytics: boolean;
  canManageDocuments: boolean;
  canManageIntegrations: boolean;
  canSwitchCompany: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    canEditLeads: true,
    canDeleteLeads: true,
    canDeleteEmployees: true,
    canManageEmployees: true,
    canViewRevenue: true,
    canManageCompany: true,
    canAccessSuperAdmin: true,
    canAccessFieldTools: true,
    canViewTeamMembers: true,
    canGenerateQuotes: true,
    canAccessSettings: true,
    canAccessAnalytics: true,
    canManageDocuments: true,
    canManageIntegrations: true,
    canSwitchCompany: true,
  },
  owner: {
    canEditLeads: true,
    canDeleteLeads: true,
    canDeleteEmployees: true,
    canManageEmployees: true,
    canViewRevenue: true,
    canManageCompany: true,
    canAccessSuperAdmin: false,
    canAccessFieldTools: true,
    canViewTeamMembers: true,
    canGenerateQuotes: true,
    canAccessSettings: true,
    canAccessAnalytics: true,
    canManageDocuments: true,
    canManageIntegrations: true,
    canSwitchCompany: false,
  },
  employee: {
    canEditLeads: true, // Only own assigned tasks / checklist items
    canDeleteLeads: false,
    canDeleteEmployees: false,
    canManageEmployees: false,
    canViewRevenue: false,
    canManageCompany: false,
    canAccessSuperAdmin: false,
    canAccessFieldTools: true,
    canViewTeamMembers: false, // Employee sees own work only
    canGenerateQuotes: false,
    canAccessSettings: false,
    canAccessAnalytics: false,
    canManageDocuments: false,
    canManageIntegrations: false,
    canSwitchCompany: false,
  },
};

export const canEditLeads = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canEditLeads ?? true;
};

export const canDeleteLead = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canDeleteLeads ?? false;
};

export const canDeleteEmployees = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canDeleteEmployees ?? false;
};

export const canManageEmployees = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canManageEmployees ?? false;
};

export const canViewRevenue = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canViewRevenue ?? false;
};

export const canManageCompany = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canManageCompany ?? false;
};

export const canAccessSuperAdmin = (role?: string | null): boolean => {
  return role === 'super_admin' || role === 'superadmin';
};

export const canAccessAdmin = canAccessSuperAdmin;

export const canSwitchCompany = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canSwitchCompany ?? false;
};

export const canAccessFieldTools = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canAccessFieldTools ?? true;
};

export const canViewTeamMembers = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canViewTeamMembers ?? false;
};

export const canGenerateQuotes = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canGenerateQuotes ?? false;
};

export const canAccessSettings = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canAccessSettings ?? false;
};

export const canAccessAnalytics = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canAccessAnalytics ?? false;
};

export const canManageIntegrations = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canManageIntegrations ?? false;
};

export const getDefaultRouteForRole = (role?: string | null): string => {
  if (role === 'super_admin') return '/admin';
  if (role === 'employee') return '/employee';
  return '/dashboard';
};
