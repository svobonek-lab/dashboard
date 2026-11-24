import React, { useEffect, useMemo, useState } from 'react';
import { OrganizationContext, type Organization, type OrganizationContextType } from '@/entities/session';
import { LeadDetail, LeadsKanban } from '@/features/manage-leads';
import { OwnerDashboard } from '../../../../widgets/owner-dashboard';
import { OwnerLayout } from '@/widgets/workspace-shell';
import { generateRealisticEmployees, PUBLIC_DEMO_COMPANY_NAME, PUBLIC_DEMO_LEADS, PUBLIC_DEMO_LEAD_STATES } from '@/features/public-demo';
import { DEFAULT_DEMO_ORG_ID } from '@/shared/api/supabase';
import { RouterProvider, useRouter } from '@/shared/lib/router';
import type { CompanyBranding } from '@/entities/company';
import type { Lead, LeadStatus } from '@/entities/lead';
import { normalizePublicOrigin } from '@/shared/lib/publicUrls';

const landingOrigin = normalizePublicOrigin(import.meta.env.PUBLIC_LANDING_URL, Boolean(import.meta.env.DEV));

const DEMO_BRANDING: CompanyBranding = {
  name: PUBLIC_DEMO_COMPANY_NAME,
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

const DEMO_LEADS: Lead[] = PUBLIC_DEMO_LEADS.map(lead => ({
  organization_id: DEMO_ORGANIZATION.id,
  id: lead.id, title: lead.project, customerName: lead.customer, city: lead.city, address: lead.city,
  price: lead.value, status: PUBLIC_DEMO_LEAD_STATES[lead.status].status, priority: 'Medium',
  description: '', customerPhone: '', customerEmail: '', preferredDate: '',
  assignedEmployeeId: '', assignedEmployeeName: '', thumbnail: '',
  photos: [], files: [], checklist: [], timeline: [], aiChat: [], history: [],
  aiSummary: { jobType: '', complexity: 'Low', estimatedRange: '', assignedEmployee: '', risks: [], recommendedNextStep: '' },
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
  const [demoLeads, setDemoLeads] = useState<Lead[]>(() => DEMO_LEADS.map((lead) => ({ ...lead, history: [...lead.history] })));
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [demoNotes, setDemoNotes] = useState<Record<string, Array<{ id: string; body: string; createdAt: string }>>>({});
  const isKanban = pathname === '/demo/leads';
  const isDashboard = pathname === '/demo' || pathname === '/demo/';
  const selectedLead = useMemo(() => demoLeads.find((lead) => lead.id === selectedLeadId) || null, [demoLeads, selectedLeadId]);

  useEffect(() => {
    if (!isKanban) setSelectedLeadId(null);
  }, [isKanban]);

  const updateDemoLead = (patch: Partial<Lead> & Pick<Lead, 'id'>) => {
    setDemoLeads((current) => current.map((lead) => {
      if (lead.id !== patch.id) return lead;
      const updated = { ...lead, ...patch };
      return { ...updated, history: [{ id: `demo-event-${Date.now()}`, timestamp: new Date().toLocaleString('cs-CZ'), action: 'Údaje poptávky upraveny v ukázce', author: 'Ukázkový účet' }, ...lead.history] };
    }));
  };

  const updateDemoStatus = (leadId: string, status: LeadStatus) => {
    setDemoLeads((current) => current.map((lead) => lead.id === leadId
      ? { ...lead, status, history: [{ id: `demo-event-${Date.now()}`, timestamp: new Date().toLocaleString('cs-CZ'), action: `Stav změněn na ${status}`, author: 'Ukázkový účet' }, ...lead.history] }
      : lead));
  };

  const addDemoLead = (lead: Lead) => {
    const syntheticLead = { ...lead, organization_id: DEMO_ORGANIZATION.id, id: `demo-new-${Date.now()}` };
    setDemoLeads((current) => [syntheticLead, ...current]);
    return syntheticLead;
  };

  const addDemoNote = (leadId: string, body: string) => {
    setDemoNotes((current) => ({
      ...current,
      [leadId]: [{ id: `demo-note-${Date.now()}`, body, createdAt: new Date().toISOString() }, ...(current[leadId] || [])],
    }));
  };

  return (
    <div className="public-demo" aria-label="Public demo">
      <p className="sr-only">Veřejné demo používá pouze syntetická data. Změny se ukládají jen do dočasného stavu této stránky.</p>
      <OwnerLayout leads={demoLeads} onSelectLead={(lead) => { setSelectedLeadId(lead.id); navigate('/demo/leads'); }} demoMode>
        <div className="mb-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Ukázková data můžete upravovat. Změny zůstávají pouze v této ukázce a po obnovení stránky se vrátí do původního stavu.</div>
        <section aria-label="Nabídka StavbaFlow" className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-bold">30 dní zdarma · potom 1 990 Kč měsíčně bez DPH</p>
            <p className="mt-1 text-sm">Zřízení bez poplatku. Měsíční předplatné pro firmu do 5 uživatelů.</p>
          </div>
          {landingOrigin && <a href={`${landingOrigin}/#cenik`} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Zobrazit nabídku</a>}
        </section>
        {isKanban ? (
          selectedLead ? <LeadDetail
            lead={selectedLead}
            employees={DEMO_EMPLOYEES}
            onBack={() => setSelectedLeadId(null)}
            onOpenPhoto={() => undefined}
            onOpenVoiceNotes={() => undefined}
            onUpdateLead={updateDemoLead}
            demoMode
            demoNotes={demoNotes[selectedLead.id] || []}
            onAddDemoNote={(body) => addDemoNote(selectedLead.id, body)}
            onUpdateDemoStatus={updateDemoStatus}
          /> : <LeadsKanban
            leads={demoLeads}
            onSelectLead={(lead) => setSelectedLeadId(lead.id)}
            onUpdateLeadStatus={updateDemoStatus}
            onAddLead={addDemoLead}
            author="demo@stavbaflow.cz"
          />
        ) : isDashboard ? (
          <OwnerDashboard
            branding={DEMO_BRANDING}
            leads={demoLeads}
            employees={DEMO_EMPLOYEES}
            readOnly
            onSelectLead={(lead) => { setSelectedLeadId(lead.id); navigate('/demo/leads'); }}
            onNavigateTab={(tab) => navigate(tab === 'leads' ? '/demo/leads' : tab === 'dashboard' ? '/demo' : `/demo/${tab}`)}
          />
        ) : (
          <section className="workspace-panel p-6 sm:p-8">
            <h1 className="text-xl font-bold text-text">Tato část není součástí veřejné ukázky</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">V ukázce si můžete projít firemní přehled a poptávky. Ostatní položky menu jsou zde zobrazené kvůli náhledu rozhraní; jejich funkce vyžadují přihlášený firemní účet.</p>
            <button type="button" onClick={() => navigate('/demo')} className="workspace-primary-action mt-5 inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold">Zpět na přehled</button>
          </section>
        )}
      </OwnerLayout>
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
