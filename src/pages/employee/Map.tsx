import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { MapView } from '@/features/MapView';
import { Lead } from '@/types';

interface EmployeeMapPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const EmployeeMapPage: React.FC<EmployeeMapPageProps> = ({ leads, onSelectLead }) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  return <MapView leads={leads} branding={branding} onSelectLead={onSelectLead} />;
};
