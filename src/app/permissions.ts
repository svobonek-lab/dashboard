export type UserRole = 'super_admin' | 'owner' | 'employee';

export interface RolePermissions {
  canEditLeads: boolean;
  canDeleteEmployees: boolean;
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
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    canEditLeads: true,
    canDeleteEmployees: true,
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
  },
  owner: {
    canEditLeads: true,
    canDeleteEmployees: true,
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
  },
  employee: {
    canEditLeads: true, // Only own assigned tasks / checklist items
    canDeleteEmployees: false,
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
  },
};

export const canEditLeads = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canEditLeads ?? true;
};

export const canDeleteEmployees = (role?: string | null): boolean => {
  const r = (role as UserRole) || 'owner';
  return ROLE_PERMISSIONS[r]?.canDeleteEmployees ?? false;
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
  return role === 'super_admin';
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

export const getDefaultRouteForRole = (role?: string | null): string => {
  if (role === 'super_admin') return '/admin';
  if (role === 'employee') return '/employee';
  return '/dashboard';
};
