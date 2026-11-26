import React, { useCallback, useEffect, useState } from 'react';
import { OrganizationContext, type Organization, type OrganizationContextType } from '@/entities/session';
import { LeadsKanban, LeadDetail } from '@/features/manage-leads';
import { OwnerDashboard } from '../../../../widgets/owner-dashboard';
import {
  addDemoNote,
  createDemoLeadFromDraft,
  createInitialDemoNotes,
  createPublicDemoLeads,
  DEMO_LEAD_STATUS_LABELS,
  generateRealisticEmployees,
  getDemoLeadNotes,
  moveDemoLeadStatus,
  patchDemoLead,
  PUBLIC_DEMO_COMPANY_NAME,
  removeDemoNote,
  type DemoNote,
} from '@/features/public-demo';
import { DEFAULT_DEMO_ORG_ID } from '@/shared/api/supabase';
import { RouterProvider, useRouter } from '@/shared/lib/router';
import type { CompanyBranding } from '@/entities/company';
import type { Lead, LeadStatus } from '@/entities/lead';
import { normalizePublicOrigin } from '@/shared/lib/publicUrls';
import { DemoNotes } from './DemoNotes';
import { DemoShell } from './DemoShell';

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

const DEMO_EMPLOYEES = generateRealisticEmployees(DEMO_BRANDING.city).map((employee) => ({
  ...employee,
  organization_id: DEMO_ORGANIZATION.id,
}));

const createInitialLeads = (): Lead[] => createPublicDemoLeads(DEMO_ORGANIZATION.id, DEMO_EMPLOYEES);

// Every method that would persist something stays rejected. The visible demo changes live
// only in React state below and disappear on reload.
const rejectDemoWrite = async (): Promise<never> => {
  throw new Error('Veřejné demo nic neukládá.');
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
  fetchLeads: async () => createInitialLeads(),
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

const LEAD_DETAIL_PATH = /^\/demo\/leads\/([^/]+)\/?$/;

function readLeadIdFromPath(pathname: string): string | null {
  const match = LEAD_DETAIL_PATH.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

const PublicDemoContent: React.FC = () => {
  const { pathname, navigate } = useRouter();
  const [leads, setLeads] = useState<Lead[]>(createInitialLeads);
  const [notes, setNotes] = useState<DemoNote[]>(createInitialDemoNotes);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openLead = useCallback((lead: Lead) => navigate(`/demo/leads/${encodeURIComponent(lead.id)}`), [navigate]);

  const handleStatusChange = (leadId: string, status: LeadStatus) => {
    const lead = leads.find((candidate) => candidate.id === leadId);
    setLeads((current) => moveDemoLeadStatus(current, leadId, status));
    if (lead && lead.status !== status) {
      setNotice(`Zakázka „${lead.title}“ je ve stavu „${DEMO_LEAD_STATUS_LABELS[status]}“. Změna platí jen v tomto demu.`);
    }
  };

  const handleAddLead = (draft: Lead): Lead => {
    const lead = createDemoLeadFromDraft(draft, DEMO_ORGANIZATION.id);
    setLeads((current) => [lead, ...current]);
    setNotice(`Zakázka „${lead.title}“ byla přidána jen do tohoto dema.`);
    return lead;
  };

  const handleUpdateLead = (patch: Partial<Lead> & Pick<Lead, 'id'>) => {
    setLeads((current) => patchDemoLead(current, patch));
  };

  const handleAddNote = (leadId: string, body: string) => {
    setNotes((current) => addDemoNote(current, leadId, body));
    setNotice('Poznámka byla přidána jen do tohoto dema.');
  };

  const handleReset = () => {
    setLeads(createInitialLeads());
    setNotes(createInitialDemoNotes());
    setNotice('Ukázková data byla obnovena.');
    navigate('/demo/leads');
  };

  const isLeadsArea = pathname === '/demo/leads' || pathname.startsWith('/demo/leads/');
  const selectedId = readLeadIdFromPath(pathname);
  const selectedLead = selectedId ? leads.find((lead) => lead.id === selectedId) ?? null : null;
  const exitLink = landingOrigin ? { href: `${landingOrigin}/`, label: 'Zpět na web' } : { href: '/', label: 'Opustit demo' };

  let content: React.ReactNode;
  if (!isLeadsArea) {
    content = (
      <OwnerDashboard
        branding={DEMO_BRANDING}
        leads={leads}
        employees={DEMO_EMPLOYEES}
        onSelectLead={openLead}
        onNavigateTab={(tab) => navigate(tab === 'leads' || tab === 'projects' ? '/demo/leads' : '/demo')}
      />
    );
  } else if (selectedId && !selectedLead) {
    content = (
      <div className="workspace-panel p-6 sm:p-8">
        <h1 className="workspace-title">Zakázka nenalezena</h1>
        <p className="mt-2 text-sm text-slate-600">Tato ukázková zakázka už není k dispozici.</p>
        <button type="button" onClick={() => navigate('/demo/leads')} className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Zpět na poptávky</button>
      </div>
    );
  } else if (selectedLead) {
    content = (
      <LeadDetail
        lead={selectedLead}
        employees={DEMO_EMPLOYEES}
        onBack={() => navigate('/demo/leads')}
        onOpenPhoto={() => undefined}
        onOpenVoiceNotes={() => undefined}
        onUpdateLead={handleUpdateLead}
        showDocuments={false}
        extraSection={(
          <DemoNotes
            notes={getDemoLeadNotes(notes, selectedLead.id)}
            onAdd={(body) => handleAddNote(selectedLead.id, body)}
            onRemove={(noteId) => setNotes((current) => removeDemoNote(current, noteId))}
          />
        )}
      />
    );
  } else {
    content = (
      <LeadsKanban
        leads={leads}
        onSelectLead={openLead}
        onUpdateLeadStatus={handleStatusChange}
        onAddLead={handleAddLead}
        author="Demo majitel"
      />
    );
  }

  return (
    <div className="public-demo" aria-label="Public demo">
      <p className="sr-only">Veřejné demo používá výhradně syntetická data. Změny se neukládají a po obnovení stránky zmizí.</p>
      <DemoShell exitLink={exitLink} onReset={handleReset}>
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">Veřejné demo · pouze syntetická data · změny se neukládají</div>
        {content}
      </DemoShell>
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 lg:left-[calc(50%+8rem)]">
        {notice && <p className="pointer-events-auto rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">{notice}</p>}
      </div>
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
