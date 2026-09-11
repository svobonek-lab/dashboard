import React from 'react';
import { MapView } from '@/features/MapView';
import { useBranding } from '@/hooks/useBranding';
import { Lead } from '@/types';

interface EmployeeMapPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const EmployeeMapPage: React.FC<EmployeeMapPageProps> = ({ leads, onSelectLead }) => {
  const { branding } = useBranding();
  return <MapView leads={leads} branding={branding} onSelectLead={onSelectLead} />;
};
