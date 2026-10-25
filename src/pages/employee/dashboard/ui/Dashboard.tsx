import { useOrganization } from '@/entities/session';
import React from 'react';
import { EmployeeDashboard } from '@/features/employee-workflow';
import type { Lead, LeadStatus } from '@/entities/lead';
import { WorkspaceReadinessPanel } from '../../../../widgets/workspace-readiness';
import { buildWorkspaceReadiness } from '@/widgets/workspace-readiness';

interface EmployeeDashboardPageProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void> | void;
}

export const EmployeeDashboardPage: React.FC<EmployeeDashboardPageProps> = ({
  leads,
  onSelectLead,
  onUpdateLead,
  onUpdateLeadStatus,
}) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  const readiness = buildWorkspaceReadiness({ organization: currentOrg, leads, employees: [], role: 'employee', assignedLeads: leads });

  return <div className="space-y-5">
    {readiness.percent === 0 && <WorkspaceReadinessPanel organization={currentOrg} leads={leads} employees={[]} role="employee" assignedLeads={leads} compact />}
    <EmployeeDashboard leads={leads} branding={branding} onOpenVoiceNotes={() => {}} onSelectLead={onSelectLead} onUpdateLead={onUpdateLead} onUpdateLeadStatus={onUpdateLeadStatus} />
  </div>;
};
