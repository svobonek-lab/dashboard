import { createContext, useContext } from 'react';
import type { OrganizationContextType } from '../../entities/session';
export type { DBProject, DBUser, Organization, OrganizationContextType } from '../../entities/session';

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used within an OrganizationProvider');
  return context;
};
