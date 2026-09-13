import React from 'react';
import { EmployeeDashboard } from '@/features/EmployeeDashboard';
import { useBranding } from '@/hooks/useBranding';
import { Lead } from '@/types';

interface EmployeeDashboardPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

export const EmployeeDashboardPage: React.FC<EmployeeDashboardPageProps> = ({
  leads,
  onSelectLead,
  onUpdateLead
}) => {
  const { branding } = useBranding();

  return (
    <EmployeeDashboard
      leads={leads}
      branding={branding}
      onOpenVoiceNotes={() => {}}
      onSelectLead={onSelectLead}
      onUpdateLead={onUpdateLead}
    />
  );
};
