import React from 'react';
import { OrganizationContext, type Organization, type OrganizationContextType } from '@/entities/session';
import { LeadsKanban } from '@/features/manage-leads';
import { OwnerDashboard } from '../../../../widgets/owner-dashboard';
import { generateRealisticEmployees, generateRealisticLeads } from '@/features/public-demo';
import { DEFAULT_DEMO_ORG_ID } from '@/shared/api/supabase';
import { RouterProvider, useRouter } from '@/shared/lib/router';
import type { CompanyBranding } from '@/entities/company';
import { normalizePublicOrigin } from '@/shared/lib/publicUrls';

const landingOrigin = normalizePublicOrigin(import.meta.env.PUBLIC_LANDING_URL, Boolean(import.meta.env.DEV));

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
    <div className="public-demo" aria-label="Public demo">
      <p className="sr-only">Veřejné demo je pouze pro čtení a používá výhradně syntetická data.</p>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/" className="text-base font-bold tracking-tight text-slate-950">StavbaFlow demo</a>
          <nav aria-label="Veřejné demo" className="flex items-center gap-2">
            <button type="button" aria-current={!isKanban ? 'page' : undefined} onClick={() => navigate('/demo')} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Přehled</button>
            <button type="button" aria-current={isKanban ? 'page' : undefined} onClick={() => navigate('/demo/leads')} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Poptávky</button>
          </nav>
          <div className="flex items-center gap-2">
            {landingOrigin && <a href={`${landingOrigin}/`} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Zpět na web</a>}
            <a href="/login" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Přihlásit se</a>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">Veřejné demo · pouze syntetická data · pouze pro čtení</div>
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
      </main>
    </div>
  );
};

export const PublicDemoWorkspace: React.FC = () => (
  <OrganizationContext.Provider value={DEMO_CONTEXT}>
    <RouterProvider>
      <PublicDemoContent />
    </RouterProvider>
  </OrganizationContext.Provider>
);
