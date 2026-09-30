import { useOrganization } from '@/context/OrganizationContext';
import React from 'react';
import { useRouter } from '../../app/router';
import { OwnerDashboard } from '@/features/OwnerDashboard';
import { OnboardingChecklist } from '@/features/OnboardingChecklist';
import { Lead, Employee } from '@/types';
import { WorkspaceReadinessPanel } from '@/features/WorkspaceReadinessPanel';

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

  if (isEmptyWorkspace) return <OnboardingChecklist leadsCount={leads.length} employeesCount={employees.length} />;

  return <div className="space-y-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold text-brand-primary">Dnešní přehled</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">Co dnes potřebuje pozornost</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Přehled poptávek, týmu a zakázek firmy na jednom místě.</p>
      </div>
      <button type="button" onClick={() => navigate('/leads')} className="workspace-primary-action inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold">
        Nová poptávka
      </button>
    </div>
    <WorkspaceReadinessPanel organization={currentOrg} leads={leads} employees={employees} role="owner" compact />
    <OwnerDashboard branding={branding} leads={leads} onSelectLead={(l) => { onSelectLead(l); navigate('/leads'); }} onNavigateTab={(tab) => { navigate(`/${tab}`); }} />
  </div>;
};
