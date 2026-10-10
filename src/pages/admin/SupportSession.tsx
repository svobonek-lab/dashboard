import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, ShieldCheck } from 'lucide-react';
import { OrganizationContext, useOrganization, type OrganizationContextType } from '@/context/OrganizationContext';
import { OwnerDashboard } from '@/features/OwnerDashboard';
import { OwnerLeadsPage } from '@/src/pages/owner/Leads';
import { OwnerProjectsPage } from '@/src/pages/owner/Projects';
import { OwnerLayout } from '@/src/layouts/OwnerLayout';
import { toAppLead, toAppMember, type AppLeadRow } from '@/src/app/productionSchema';
import { hydrateLeadAssignments, toLeadPatch } from '@/src/app/pilotWrites';
import {
  getPlatformSupportSession, getPlatformSupportWorkspace, mutatePlatformSupportLead,
  revokePlatformSupportSession, type PlatformSupportSession,
} from '../../app/platformClient';
import { useRouter } from '../../app/router';
import type { Lead, LeadStatus } from '@/types';

const STORAGE_KEY = 'stavbaflow_platform_support_session';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const AdminSupportSessionPage: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const platformContext = useOrganization();
  const { pathname, navigate } = useRouter();
  const [session, setSession] = useState<PlatformSupportSession | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const remaining = useMemo(() => session ? Math.max(0, Math.ceil((new Date(session.expires_at).getTime() - now) / 60000)) : 0, [now, session]);
  const supportBase = `/support/${sessionId}`;

  const leaveSupport = useCallback(async (revoke = true) => {
    try { if (revoke) await revokePlatformSupportSession(sessionId); }
    finally { sessionStorage.removeItem(STORAGE_KEY); navigate('/admin/companies', { replace: true }); }
  }, [navigate, sessionId]);

  const applyWorkspace = useCallback((workspace: Awaited<ReturnType<typeof getPlatformSupportWorkspace>>) => {
    const members = (workspace.members || []).map(toAppMember);
    const mappedLeads = hydrateLeadAssignments((workspace.leads || []).map((row) => toAppLead(row)), members);
    setCompany(workspace.company); setEmployees(members); setLeads(mappedLeads);
    setSelectedLead((current) => current ? mappedLeads.find((lead) => lead.id === current.id) || null : null);
    return { members, mappedLeads };
  }, []);
  const refresh = useCallback(async () => applyWorkspace(await getPlatformSupportWorkspace(sessionId)).mappedLeads, [applyWorkspace, sessionId]);

  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || stored.id !== sessionId || new Date(stored.expiresAt).getTime() <= Date.now()) { setError('Dočasná relace v tomto prohlížeči chybí nebo vypršela.'); return; }
    } catch { setError('Dočasnou relaci se nepodařilo bezpečně ověřit.'); return; }
    Promise.all([getPlatformSupportSession(sessionId), getPlatformSupportWorkspace(sessionId)])
      .then(([activeSession, workspace]) => { setSession(activeSession); applyWorkspace(workspace); })
      .catch((value) => setError(value instanceof Error ? value.message : 'Relace podpory není dostupná.'));
  }, [applyWorkspace, sessionId]);

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (session && new Date(session.expires_at).getTime() <= now) void leaveSupport(false); }, [leaveSupport, now, session]);

  const persistLead = useCallback(async (input: Partial<Lead>) => {
    const action = input.id && UUID.test(input.id) ? 'update_lead' : 'create_lead';
    const row = await mutatePlatformSupportLead(sessionId, action, toLeadPatch(input), action === 'update_lead' ? input.id : undefined);
    const employee = employees.find((item) => item.id === row.assigned_to);
    const mapped = toAppLead(row as AppLeadRow, employee?.name || '');
    setLeads((current) => action === 'create_lead' ? [mapped, ...current] : current.map((lead) => lead.id === mapped.id ? mapped : lead));
    setSelectedLead((current) => current?.id === mapped.id ? mapped : current);
    return mapped;
  }, [employees, sessionId]);

  const updateStatus = useCallback(async (leadId: string, status: string) => {
    const row = await mutatePlatformSupportLead(sessionId, 'update_status', toLeadPatch({ status: status as LeadStatus }), leadId);
    const employee = employees.find((item) => item.id === row.assigned_to);
    const mapped = toAppLead(row as AppLeadRow, employee?.name || '');
    setLeads((current) => current.map((lead) => lead.id === leadId ? mapped : lead));
    setSelectedLead((current) => current?.id === leadId ? mapped : current);
  }, [employees, sessionId]);

  if (error) return <main className="min-h-screen bg-slate-950 p-6 text-white"><section className="mx-auto mt-24 max-w-xl rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8 text-rose-100"><h1 className="text-xl font-black">Přístup byl odmítnut</h1><p className="mt-2 text-sm">{error}</p><button onClick={() => navigate('/admin/companies')} className="mt-5 rounded-xl border border-rose-300/30 px-4 py-2 text-sm font-bold">Vrátit se do Adminu</button></section></main>;
  if (!session || !company) return <div className="min-h-screen bg-slate-950 py-20 text-center text-sm text-slate-400">Ověřuji auditovanou relaci a načítám workspace…</div>;

  const organization = { id: company.id, name: company.name, slug: company.slug, email: company.email || '', phone: company.phone || '', address: company.address || '', primary_color: company.color || '#2563eb', logo_url: company.logo_url || '', plan: company.plan || session.subscription_status || 'pilot', status: company.active === false ? 'Suspended' : 'Active' };
  const unsupported = async (): Promise<never> => { throw new Error('Tato operace zatím není součástí auditovaného support workspace.'); };
  const supportContext: OrganizationContextType = {
    ...platformContext, currentOrg: organization, organizations: [organization],
    dbUser: { id: platformContext.user?.id || 'platform-admin', organization_id: company.id, role: 'owner', email: platformContext.user?.email, name: 'Platform Admin' },
    fetchLeads: refresh, saveLead: persistLead, createLead: persistLead, updateLeadStatus: updateStatus,
    fetchEmployees: async () => employees, fetchProjects: async () => [], saveEmployee: unsupported, inviteEmployee: unsupported,
    resendEmployeeInvite: unsupported, resetEmployeePassword: unsupported, deactivateEmployee: unsupported, deleteEmployee: unsupported,
    saveProject: unsupported, impersonatingOrgId: company.id, stopImpersonation: () => void leaveSupport(),
  };
  const suffix = pathname.slice(supportBase.length) || '/dashboard';

  return <OrganizationContext.Provider value={supportContext}>
    <OwnerLayout leads={leads} onSelectLead={setSelectedLead} readOnlyMode="support" onExitReadOnly={() => void leaveSupport()}>
      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><ShieldCheck className="h-6 w-6 shrink-0 text-amber-700" /><div><strong className="text-slate-950">Impersonating: {company.name} · auditovaná plná podpora</strong><p className="mt-1 text-sm text-amber-900/75">Každý zápis je svázaný s touto relací, firmou a administrátorským účtem.</p></div></div>
        <span className="inline-flex items-center gap-2 text-sm font-bold text-amber-900"><Clock3 className="h-4 w-4" />{remaining} min</span>
      </div>
      {suffix === '/leads' ? <OwnerLeadsPage leads={leads} employees={employees} selectedLead={selectedLead} onSelectLead={setSelectedLead} onUpdateLeadStatus={(id, status) => void updateStatus(id, status)} onUpdateLead={persistLead} onAddLead={persistLead as any} />
        : suffix === '/projects' ? <OwnerProjectsPage leads={leads} onSelectLead={setSelectedLead} leadDestination={`${supportBase}/leads`} />
        : <OwnerDashboard branding={organization as any} leads={leads} employees={employees} onSelectLead={(lead) => { setSelectedLead(lead); navigate(`${supportBase}/leads`); }} onNavigateTab={(tab) => navigate(`${supportBase}/${tab === 'dashboard' ? 'dashboard' : tab}`)} />}
    </OwnerLayout>
  </OrganizationContext.Provider>;
};
