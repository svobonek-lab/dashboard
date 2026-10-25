import { createContext, useContext } from 'react';
import type { OrganizationContextType } from './types';
export type { DBProject, DBUser, Organization, OrganizationContextType } from './types';

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used within an OrganizationProvider');
  return context;
};
