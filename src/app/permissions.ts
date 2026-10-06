export type UserRole = 'platform_admin' | 'owner' | 'employee';

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
  platform_admin: {
    canEditLeads: false,
    canDeleteLeads: false,
    canDeleteEmployees: false,
    canManageEmployees: false,
    canViewRevenue: false,
    canManageCompany: false,
    canAccessSuperAdmin: true,
    canAccessFieldTools: false,
    canViewTeamMembers: false,
    canGenerateQuotes: false,
    canAccessSettings: false,
    canAccessAnalytics: false,
    canManageDocuments: false,
    canManageIntegrations: false,
    canSwitchCompany: false,
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

const permissionsFor = (role?: string | null): RolePermissions | null => (
  role === 'platform_admin' || role === 'owner' || role === 'employee'
    ? ROLE_PERMISSIONS[role]
    : null
);

export const canEditLeads = (role?: string | null): boolean => {
  return permissionsFor(role)?.canEditLeads ?? false;
};

export const canDeleteLead = (role?: string | null): boolean => {
  return permissionsFor(role)?.canDeleteLeads ?? false;
};

export const canDeleteEmployees = (role?: string | null): boolean => {
  return permissionsFor(role)?.canDeleteEmployees ?? false;
};

export const canManageEmployees = (role?: string | null): boolean => {
  return permissionsFor(role)?.canManageEmployees ?? false;
};

export const canViewRevenue = (role?: string | null): boolean => {
  return permissionsFor(role)?.canViewRevenue ?? false;
};

export const canManageCompany = (role?: string | null): boolean => {
  return permissionsFor(role)?.canManageCompany ?? false;
};

export const canAccessSuperAdmin = (role?: string | null): boolean => {
  return role === 'platform_admin';
};

export const canAccessAdmin = canAccessSuperAdmin;

export const canSwitchCompany = (role?: string | null): boolean => {
  return permissionsFor(role)?.canSwitchCompany ?? false;
};

export const canAccessFieldTools = (role?: string | null): boolean => {
  return permissionsFor(role)?.canAccessFieldTools ?? false;
};

export const canViewTeamMembers = (role?: string | null): boolean => {
  return permissionsFor(role)?.canViewTeamMembers ?? false;
};

export const canGenerateQuotes = (role?: string | null): boolean => {
  return permissionsFor(role)?.canGenerateQuotes ?? false;
};

export const canAccessSettings = (role?: string | null): boolean => {
  return permissionsFor(role)?.canAccessSettings ?? false;
};

export const canAccessAnalytics = (role?: string | null): boolean => {
  return permissionsFor(role)?.canAccessAnalytics ?? false;
};

export const canManageIntegrations = (role?: string | null): boolean => {
  return permissionsFor(role)?.canManageIntegrations ?? false;
};

export const getDefaultRouteForRole = (role?: string | null): string => {
  if (role === 'platform_admin') return '/admin';
  if (role === 'employee') return '/employee';
  return '/dashboard';
};
