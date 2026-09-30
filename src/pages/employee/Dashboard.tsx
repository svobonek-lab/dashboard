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

  return <div className="space-y-5">
    <div>
      <p className="text-xs font-semibold text-brand-primary">Pracovní prostor</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Moje dnešní práce</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Vidíte jen zakázky, které vám firma přiřadila.</p>
    </div>
    <WorkspaceReadinessPanel organization={currentOrg} leads={leads} employees={[]} role="employee" assignedLeads={leads} compact />
    <EmployeeDashboard leads={leads} branding={branding} onOpenVoiceNotes={() => {}} onSelectLead={onSelectLead} onUpdateLead={onUpdateLead} />
  </div>;
};
