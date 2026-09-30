import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { EmployeeDashboard } from '@/features/EmployeeDashboard';
import { Lead } from '@/types';
import { WorkspaceReadinessPanel } from '@/features/WorkspaceReadinessPanel';

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
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};

  return <div className="space-y-6">
    <WorkspaceReadinessPanel organization={currentOrg} leads={leads} employees={[]} role="employee" assignedLeads={leads} compact />
    <EmployeeDashboard leads={leads} branding={branding} onOpenVoiceNotes={() => {}} onSelectLead={onSelectLead} onUpdateLead={onUpdateLead} />
  </div>;
};
