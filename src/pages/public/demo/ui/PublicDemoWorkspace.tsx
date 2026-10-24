import React from 'react';
import { OrganizationContext, type Organization, type OrganizationContextType } from '@/context/OrganizationContextBase';
import { LeadsKanban } from '@/src/features/manage-leads';
import { OwnerDashboard } from '../../../../widgets/owner-dashboard';
import { generateRealisticEmployees, generateRealisticLeads } from '@/lib/demoData';
import { DEFAULT_DEMO_ORG_ID } from '@/lib/supabase';
import { OwnerLayout } from '../../../../widgets/workspace-shell';
import { RouterProvider, useRouter } from '@/src/app/router';
import type { CompanyBranding } from '@/types';

const DEMO_BRANDING: CompanyBranding = {
  name: 'Novákova stavební firma',
  primaryColor: '#2563eb',
  phone: '+420 777 123 456',
  email: 'demo@stavbaflow.cz',
  city: 'Brno',
  address: 'Stavební 24, Brno',
  services: ['Rekonstrukce', 'Střechy', 'Pergoly'],
};

const DEMO_ORGANIZATION: Organization = {
  id: DEFAULT_DEMO_ORG_ID,
  name: DEMO_BRANDING.name,
  slug: 'verejne-demo',
  email: DEMO_BRANDING.email,
  phone: DEMO_BRANDING.phone,
  city: DEMO_BRANDING.city,
  address: DEMO_BRANDING.address,
  primary_color: DEMO_BRANDING.primaryColor,
  plan: 'DEMO',
  status: 'active',
  branding: DEMO_BRANDING,
};

const DEMO_LEADS = generateRealisticLeads(DEMO_BRANDING).map((lead) => ({
  ...lead,
  organization_id: DEMO_ORGANIZATION.id,
}));

const DEMO_EMPLOYEES = generateRealisticEmployees(DEMO_BRANDING.city).map((employee) => ({
  ...employee,
  organization_id: DEMO_ORGANIZATION.id,
}));

const rejectDemoWrite = async (): Promise<never> => {
  throw new Error('Veřejné demo je pouze pro čtení.');
};

const DEMO_CONTEXT: OrganizationContextType = {
  isConfigured: false,
  user: { id: 'public-demo-user', email: 'demo@stavbaflow.cz' },
  dbUser: { id: 'public-demo-user', organization_id: DEMO_ORGANIZATION.id, role: 'owner', email: 'demo@stavbaflow.cz', name: 'Demo majitel' },
  currentOrg: DEMO_ORGANIZATION,
  organizations: [DEMO_ORGANIZATION],
  isLoading: false,
  invitePasswordRequired: false,
  error: null,
  schemaError: null,
  clearSchemaError: () => undefined,
  login: rejectDemoWrite,
  completeInvitePasswordSetup: rejectDemoWrite,
  signUp: rejectDemoWrite,
  logout: async () => undefined,
  createOrganization: rejectDemoWrite,
  switchOrganization: rejectDemoWrite,
  fetchLeads: async () => DEMO_LEADS,
  saveLead: rejectDemoWrite,
  createLead: rejectDemoWrite,
  updateLeadStatus: rejectDemoWrite,
  fetchEmployees: async () => DEMO_EMPLOYEES,
  saveEmployee: rejectDemoWrite,
  inviteEmployee: rejectDemoWrite,
  resendEmployeeInvite: rejectDemoWrite,
  resetEmployeePassword: rejectDemoWrite,
  deactivateEmployee: rejectDemoWrite,
  deleteEmployee: rejectDemoWrite,
  fetchProjects: async () => [],
  saveProject: rejectDemoWrite,
  impersonatingOrgId: null,
  originalOrg: null,
  impersonateOrganization: rejectDemoWrite,
  stopImpersonation: () => undefined,
  fetchAllOrganizationsAdmin: rejectDemoWrite,
  deleteOrganizationAdmin: rejectDemoWrite,
  updateBrandingAdmin: rejectDemoWrite,
  suspendOrganizationAdmin: rejectDemoWrite,
  createCustomerAdmin: rejectDemoWrite,
};

const PublicDemoContent: React.FC = () => {
  const { pathname, navigate } = useRouter();
  const isKanban = pathname === '/demo/leads';

  return (
    <OwnerLayout
      leads={DEMO_LEADS}
      readOnlyMode="demo"
      onExitReadOnly={() => window.location.assign('/')}
    >
      <p className="sr-only">Veřejné demo je pouze pro čtení a používá výhradně syntetická data.</p>
      {isKanban ? (
        <LeadsKanban
          leads={DEMO_LEADS}
          onSelectLead={() => undefined}
          onUpdateLeadStatus={() => undefined}
          readOnly
        />
      ) : (
        <OwnerDashboard
          branding={DEMO_BRANDING}
          leads={DEMO_LEADS}
          employees={DEMO_EMPLOYEES}
          readOnly
          onSelectLead={() => navigate('/demo/leads')}
          onNavigateTab={(tab) => navigate(tab === 'leads' ? '/demo/leads' : '/demo')}
        />
      )}
    </OwnerLayout>
  );
};

export const PublicDemoWorkspace: React.FC = () => (
  <OrganizationContext.Provider value={DEMO_CONTEXT}>
    <RouterProvider>
      <PublicDemoContent />
    </RouterProvider>
  </OrganizationContext.Provider>
);
