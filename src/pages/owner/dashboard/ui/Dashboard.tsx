import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { useRouter } from '@/src/app/router';
import { OwnerDashboard } from '../../../../widgets/owner-dashboard';
import { OnboardingChecklist } from '@/src/features/onboarding-checklist';
import { Lead, Employee } from '@/types';
import { WorkspaceReadinessPanel } from '../../../../widgets/workspace-readiness';
import { buildWorkspaceReadiness } from '@/src/app/workspaceReadiness';

interface OwnerDashboardPageProps {
  leads: Lead[];
  employees?: Employee[];
  onSelectLead: (lead: Lead) => void;
}

export const OwnerDashboardPage: React.FC<OwnerDashboardPageProps> = ({
  leads,
  employees = [],
  onSelectLead
}) => {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  const { navigate } = useRouter();
  const readiness = buildWorkspaceReadiness({ organization: currentOrg, leads, employees, role: 'owner' });

  // Condition for Empty Workspace
  const isEmptyWorkspace = leads.length === 0;

  if (isEmptyWorkspace) return <OnboardingChecklist leadsCount={leads.length} employeesCount={employees.length} organizationName={currentOrg?.name || ''} hasIdentity={Boolean(currentOrg?.name && (currentOrg?.city || currentOrg?.email))} onNavigate={navigate} />;

  return <div className="space-y-5">
    {readiness.percent < 100 && <WorkspaceReadinessPanel organization={currentOrg} leads={leads} employees={employees} role="owner" compact />}
    <OwnerDashboard branding={branding} leads={leads} onSelectLead={(l) => { onSelectLead(l); navigate('/leads'); }} onNavigateTab={(tab) => { navigate(`/${tab}`); }} />
  </div>;
};
