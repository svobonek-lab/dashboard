import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { useRouter } from '../../app/router';
import { OwnerDashboard } from '@/features/OwnerDashboard';
import { OnboardingChecklist } from '@/features/OnboardingChecklist';
import { Lead, Employee } from '@/types';

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

  // Condition for Empty Workspace
  const isEmptyWorkspace = leads.length === 0;

  if (isEmptyWorkspace) {
    return <OnboardingChecklist leadsCount={leads.length} employeesCount={employees.length} />;
  }

  return (
    <OwnerDashboard
      branding={branding}
      leads={leads}
      onSelectLead={(l) => {
        onSelectLead(l);
        navigate('/leads');
      }}
      onNavigateTab={(tab) => {
        navigate(`/${tab}`);
      }}
    />
  );
};
