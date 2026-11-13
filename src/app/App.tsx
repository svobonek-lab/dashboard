import { PaidRegistrationPage } from '../pages/auth/paid-registration';
import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/entities/session';
import { RouterProvider, useRouter } from '../shared/lib/router';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { SubscriptionGuard } from './SubscriptionGuard';
import { getDefaultRouteForRole, type UserRole } from '../shared/model/permissions';
import { canEmployeeAccessLead, getEmployeeLeads } from './employeeScope';
import { requestImmediateOutboxDispatch } from '../shared/api/emailNotifications';

// Layouts
import { SuperAdminLayout, OwnerLayout, EmployeeLayout } from '../widgets/workspace-shell';

// Super Admin Pages
import { AdminDashboardPage } from '../pages/admin/dashboard';
import { AdminCompaniesPage } from '../pages/admin/companies';
import { AdminSupportSessionPage } from '../pages/admin/support-session';

// Owner Pages
import { OwnerDashboardPage } from '../pages/owner/dashboard';
import { OwnerLeadsPage } from '../pages/owner/leads';
import { OwnerProjectsPage } from '../pages/owner/projects';
import { OwnerEmployeesPage } from '../pages/owner/employees';
import { OwnerWidgetPage } from '../pages/owner/widget';
import { PilotUnavailablePage } from '../pages/owner/pilot-unavailable';
import { isPilotUnavailablePath } from '../shared/lib/pilotScope';
import { OwnerSettingsPage } from '../pages/owner/settings';
import { BillingReturnPage } from '../pages/owner/billing-return';
import { Integrations } from '../pages/owner/integrations';

// Employee Pages
import { EmployeeDashboardPage } from '../pages/employee/dashboard';
import { EmployeeJobsPage } from '../pages/employee/jobs';
import { EmployeePhotosPage } from '../pages/employee/photos';
import { LeadDetail } from '../features/manage-leads';

// Public & Embed Views
import { LoginPage } from '../pages/auth/login';
import { WidgetIframePage } from '../pages/public/iframe';

// Types
import type { Lead, LeadStatus } from '@/entities/lead';
import { getLandingLoginUrl, getDeploymentConfig, shouldShowLandingAtRoot } from './deploymentSurface';
import { isKnownAppPath } from './routePolicy';
import { getLeadTransitionError } from '../entities/lead';
import { readTenantCache, removeTenantCache, writeTenantCache, TENANT_CACHE_NAMES } from '../shared/lib/tenantCache';
import { canEditLeadDetails, persistBeforeApply } from './pilotWrites';
import { hydrateLeadAssignments } from '../entities/lead';

const { surface: deploymentSurface, appUrl } = getDeploymentConfig((import.meta as any).env || {});
const LandingPage = React.lazy(() => import('../pages/public/landing').then(module => ({ default: module.LandingPage })));

function ExternalRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.assign(url);
  }, [url]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
      Přesměrování do přihlášení…
    </div>
  );
}

function InternalRedirect({ url }: { url: string }) {
  const { navigate } = useRouter();

  useEffect(() => {
    navigate(url, { replace: true });
  }, [navigate, url]);

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center text-muted">
      Otevírám přihlášení…
    </div>
  );
}

function AppSetupRequired() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-xs font-bold text-cyan-300">StavbaFlow workspace</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Systém čeká na připojení produkce</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Tento Vercel projekt je nastavený jako firemní aplikace, ale nemá dostupné Supabase připojení.
          Přihlášení a data firmy jsou proto zablokované, aby se nikdy nespustil ukázkový režim.
        </p>
        <p className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
          Nastavte VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY ve Vercelu a znovu nasaďte projekt.
        </p>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f7] px-5 py-16 text-slate-950">
      <section className="mx-auto mt-16 max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold text-blue-700">StavbaFlow</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Tahle stránka neexistuje</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Zkontrolujte adresu nebo se vraťte na úvodní stránku.</p>
        <a href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Zpět na úvodní stránku</a>
      </section>
    </main>
  );
}

function AppContent() {
  const { currentOrg } = useOrganization();
  const { isConfigured,
    user,
    dbUser,
    isLoading: isAuthLoading,
    fetchLeads,
    fetchEmployees,
    saveLead,
    createLead,
    updateLeadStatus
  } = useOrganization();
  const { pathname, navigate } = useRouter();

  const [leads, setLeads] = useState<Lead[]>(() => {
    if (!currentOrg?.id) return [];
    const cached = readTenantCache<Lead[]>(TENANT_CACHE_NAMES.leads, currentOrg.id);
    return Array.isArray(cached) ? cached : [];
  });
  const [employees, setEmployees] = useState([]);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const employeeLeads = dbUser?.role === 'employee'
    ? getEmployeeLeads(leads, employees, dbUser.id, dbUser.email, currentOrg?.id)
    : leads;

  // Synchronize leads & employees from active organization
  useEffect(() => {
    if (currentOrg) {
      setDataLoadError(null);
      Promise.all([fetchLeads(), fetchEmployees()])
        .then(([dbLeads, dbEmployees]) => {
          setDataLoadError(null);
          const hydratedLeads = hydrateLeadAssignments(dbLeads, dbEmployees);
          if (dbLeads.length > 0) {
            setLeads(hydratedLeads);
            try {
              writeTenantCache(TENANT_CACHE_NAMES.leads, hydratedLeads, currentOrg.id);
            } catch {}
          } else {
            setLeads([]);
            try {
              removeTenantCache(TENANT_CACHE_NAMES.leads, currentOrg.id);
            } catch {}
          }

          if (dbEmployees.length > 0) {
            setEmployees(dbEmployees);
          } else {
            setEmployees([]);
          }
        })
        .catch(err => {
          console.error('Error synchronizing organization data:', err);
          setLeads([]);
          setEmployees([]);
          setDataLoadError('Zakázky a zaměstnance se nepodařilo načíst. Zkontrolujte připojení a zkuste stránku obnovit.');
        });
    }
  // The organization can be restored before Supabase restores the authenticated
  // session. Re-run once the user is known so RLS reads do not leave stale
  // tenant-cache data on screen.
  }, [currentOrg?.id, user?.id]);

  // Root path routing and redirects
  useEffect(() => {
    if (isAuthLoading) return;

    if (pathname === '/landing' || pathname === '/prezentace') {
      navigate('/', { replace: true });
      return;
    }

    if (pathname === '/' && !shouldShowLandingAtRoot(deploymentSurface)) {
      if (user || dbUser) {
        const role = (dbUser?.role as UserRole) || (user?.role as UserRole) || 'owner';
        const target = getDefaultRouteForRole(role);
        navigate(target, { replace: true });
      }
    }
  }, [pathname, isAuthLoading, user, dbUser, navigate]);

  // Dynamic White Labeling (Browser Title & Favicon Update)
  useEffect(() => {
    const activeName = currentOrg?.name || 'StavbaFlow CRM';
    document.title = `${activeName} | Stavební OS`;

    const activeLogo = currentOrg?.logo_url;
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (activeLogo && activeLogo.trim() !== '') {
      link.href = activeLogo;
    } else {
      link.href = '/favicon.svg';
    }
  }, [currentOrg?.name, currentOrg?.logo_url]);

  const STATUS_LABELS: Record<LeadStatus, string> = {
    New: 'Nová poptávka',
    Contacted: 'Kontaktováno',
    Quote: 'Rozpočet / Nabídka',
    'In Progress': 'Realizace stavby',
    Completed: 'Dokončeno & Předáno',
    Lost: 'Stornováno'
  };

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    if (dbUser?.role === 'employee' && !canEmployeeAccessLead(leadId, leads, employees, dbUser.id, dbUser.email, currentOrg?.id)) {
      showToast('Tuto zakázku nemáte přiřazenou.', 'error');
      return;
    }
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;
    const previousStatus = targetLead.status;
    if (previousStatus === newStatus) return;

    const transitionError = getLeadTransitionError(
      previousStatus,
      newStatus,
      dbUser?.role === 'employee' ? 'employee' : 'owner',
    );
    if (transitionError) {
      showToast(transitionError, 'error');
      return;
    }

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const timestamp = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

    const updatedHistory = [
      {
        id: 'hist-' + Date.now(),
        timestamp,
        action: `Stav zakázky změněn na: ${statusLabel}`,
        author: dbUser?.email || 'Dispečink'
      },
      ...(targetLead.history || [])
    ];

    const updatedTimeline = [
      {
        id: 't-' + Date.now(),
        title: `Stav změněn na: ${statusLabel}`,
        status: 'Completed' as const,
        timestamp
      },
      ...(targetLead.timeline || [])
    ];

    try {
      await persistBeforeApply(
        () => updateLeadStatus(leadId, newStatus),
        () => {
          setLeads(prev => {
            const next = prev.map(l => l.id === leadId ? {
              ...l,
              status: newStatus,
              history: updatedHistory,
              timeline: updatedTimeline
            } : l);
            try {
              writeTenantCache(TENANT_CACHE_NAMES.leads, next, currentOrg?.id);
            } catch {}
            return next;
          });

          if (selectedLead && selectedLead.id === leadId) {
            setSelectedLead(prev => prev ? {
              ...prev,
              status: newStatus,
              history: updatedHistory,
              timeline: updatedTimeline
            } : null);
          }

          showToast(`Stav zakázky "${targetLead.customerName}" změněn na: ${statusLabel}`, 'success');
        },
      );
    } catch (e: any) {
      console.error('Failed to sync status with database', e);
      showToast('Nepodařilo se uložit změnu stavu. Data zůstala beze změny.', 'error');
    }
  };

  const handleUpdateLead = async (updatedLead: Partial<Lead> & Pick<Lead, 'id'>): Promise<void> => {
    if (!canEditLeadDetails(dbUser?.role)) {
      showToast('Zaměstnanec může měnit pouze stav přiřazené zakázky.', 'error');
      throw new Error('Zaměstnanec nemůže měnit detail zakázky.');
    }
    try {
      const previousLead = leads.find((lead) => lead.id === updatedLead.id);
      const savedLead = await saveLead(updatedLead);
      const assignedEmployee = employees.find((employee) => employee.id === savedLead.assignedEmployeeId);
      const hydratedLead = {
        ...savedLead,
        assignedEmployeeName: assignedEmployee?.name || savedLead.assignedEmployeeName || '',
      };
      setLeads(prev => prev.map(l => l.id === hydratedLead.id ? hydratedLead : l));
      setSelectedLead(hydratedLead);
      if (savedLead.assignedEmployeeId && previousLead?.assignedEmployeeId !== savedLead.assignedEmployeeId) {
        await requestImmediateOutboxDispatch();
      }
    } catch (error) {
      console.error('Failed to save lead', error);
      showToast('Změnu se nepodařilo uložit. Data zůstala beze změny.', 'error');
      throw error;
    }
  };

  React.useEffect(() => {
    const handleCrmLeadCreated = (e: any) => {
      if (e.detail?.lead) {
        const newLead = e.detail.lead;
        setLeads(prev => [newLead, ...prev.filter(l => l.id !== newLead.id)]);
      }
    };
    const handleCrmToast = (e: any) => {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.type || 'success');
      }
    };
    window.addEventListener('crm:lead_created', handleCrmLeadCreated as EventListener);
    window.addEventListener('crm:toast', handleCrmToast as EventListener);
    return () => {
      window.removeEventListener('crm:lead_created', handleCrmLeadCreated as EventListener);
      window.removeEventListener('crm:toast', handleCrmToast as EventListener);
    };
  }, []);

  const handleAddLead = async (incoming: any) => {
    try {
      const created = await createLead(incoming);
      setLeads(prev => [created, ...prev.filter(l => l.id !== created.id)]);
      return created;
    } catch (e) {
      console.error('Failed to add lead via unified createLead pipeline', e);
      throw e;
    }
  };

  if (deploymentSurface === 'app' && !isConfigured) {
    return <AppSetupRequired />;
  }

  if (dataLoadError) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
        <div role="alert" aria-live="assertive" className="mx-auto mt-16 max-w-xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Data se nepodařilo načíst</h1>
          <p className="mt-2 text-sm text-slate-600">{dataLoadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Zkusit znovu
          </button>
        </div>
      </main>
    );
  }

  if (!isKnownAppPath(pathname)) return <NotFoundPage />;

  // 1. Standalone / Public / Embed Routes (No Layout, No Auth required, No company data leakage)
  if (pathname === '/') {
    if (shouldShowLandingAtRoot(deploymentSurface)) {
      return <LandingPage />;
    }
    if (isAuthLoading) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    if (user || dbUser) {
      // Authenticated user arriving at '/' - useEffect redirects to role default route
      return null;
    }
    if (deploymentSurface === 'app') {
      return <LoginPage onSuccess={(signedInUser) => {
        const targetRole = signedInUser?.role || dbUser?.role || 'owner';
        navigate(getDefaultRouteForRole(targetRole), { replace: true });
      }} />;
    }
    return <LandingPage />;
  }

  if (pathname === '/landing' || pathname === '/prezentace') {
    return <LandingPage />;
  }

  if (pathname === '/unauthorized') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-slate-200 text-center">
          <h1 className="text-2xl font-black text-slate-900 mb-2">403 - Přístup odepřen</h1>
          <p className="text-slate-500 mb-6 text-sm">Nemáte oprávnění pro přístup do této sekce.</p>
          <button
            onClick={() => navigate(getDefaultRouteForRole(dbUser?.role))}
            className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold w-full hover:bg-brand-primary-dark transition-colors"
          >
            Zpět na Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (pathname === '/widget-iframe' || pathname === '/widget-iframe.html') {
    return <WidgetIframePage />;
  }

  if (pathname === '/inquiry' || pathname.startsWith('/inquiry/') || pathname === '/poptavka' || pathname === '/form' || pathname.startsWith('/form/')) {
    return <WidgetIframePage />;
  }

  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    return <div className="min-h-screen bg-slate-50 p-6 pt-24"><PilotUnavailablePage /></div>;
  }

  const roleLoginRoutes: Record<string, UserRole> = {
    '/admin/login': 'platform_admin',
    '/owner/login': 'owner',
    '/employee/login': 'employee',
  };

  if (pathname === '/register-paid' && deploymentSurface === 'landing') {
    return <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><div className="mx-auto mt-20 max-w-lg rounded-xl bg-white p-8"><h1 className="text-2xl font-semibold">Registrace zde není dostupná</h1><a className="mt-5 inline-block underline" href="/">Zpět na web</a></div></main>;
  }
  if (pathname === '/register-paid') return <PaidRegistrationPage />;

  if (pathname === '/login' || roleLoginRoutes[pathname]) {
    if (deploymentSurface === 'landing') {
      const destination = getLandingLoginUrl(appUrl, window.location.search, Boolean((import.meta as any).env?.DEV));
      return destination
        ? <ExternalRedirect url={destination} />
        : <main className="min-h-screen bg-slate-50 p-6 text-slate-900"><div className="mx-auto mt-20 max-w-lg rounded-xl bg-white p-8"><h1 className="text-2xl font-semibold">Přihlášení teď není dostupné</h1><p className="mt-3">Adresa aplikace není správně nastavená.</p><a className="mt-5 inline-block underline" href="/">Zpět na web</a></div></main>;
    }
    if (roleLoginRoutes[pathname]) {
      return <InternalRedirect url={`/login${window.location.search}`} />;
    }
    const expectedRole = roleLoginRoutes[pathname];
    return <LoginPage onSuccess={(user) => {
      const targetRole = user?.role || dbUser?.role || 'owner';
      navigate(getDefaultRouteForRole(targetRole), { replace: true });
    }} expectedRole={expectedRole} />;
  }

  if (pathname.startsWith('/support/')) {
    const sessionId = pathname.slice('/support/'.length).split('/')[0];
    return (
      <ProtectedRoute allowedRole="platform_admin">
        <AdminSupportSessionPage sessionId={sessionId} />
      </ProtectedRoute>
    );
  }

  // 2. Super Admin Routes (`/admin*`)
  if (pathname.startsWith('/admin')) {
    return (
      <ProtectedRoute allowedRole="platform_admin">
        <SuperAdminLayout>
          {pathname === '/admin' || pathname === '/admin/dashboard' ? (
            <AdminDashboardPage />
          ) : pathname === '/admin/companies' ? (
            <AdminCompaniesPage />
          ) : (
            <AdminDashboardPage />
          )}
        </SuperAdminLayout>
      </ProtectedRoute>
    );
  }

  // 3. Employee Field Routes (`/employee` and `/employee/*`)
  if (pathname === '/employee' || pathname.startsWith('/employee/')) {
    return (
      <ProtectedRoute allowedRole="employee">
        <SubscriptionGuard>
        <EmployeeLayout leads={employeeLeads}>
          {selectedLead && (pathname === '/employee' || pathname === '/employee/dashboard') ? (
            <LeadDetail lead={selectedLead} employees={[]} onBack={() => setSelectedLead(null)} onOpenPhoto={() => {}} onOpenVoiceNotes={() => {}} onUpdateLead={handleUpdateLead} canManageAssignment={false} canEditOperationalFields />
          ) : pathname === '/employee/jobs' ? (
            <EmployeeJobsPage leads={employeeLeads} onSelectLead={setSelectedLead} />
          ) : pathname === '/employee/photos' ? (
            <EmployeePhotosPage leads={selectedLead ? [selectedLead, ...employeeLeads.filter((lead) => lead.id !== selectedLead.id)] : employeeLeads} />
          ) : pathname === '/employee' || pathname === '/employee/dashboard' ? (
            <EmployeeDashboardPage leads={employeeLeads} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} onUpdateLeadStatus={handleUpdateLeadStatus} />
          ) : (
            <EmployeeDashboardPage leads={employeeLeads} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} onUpdateLeadStatus={handleUpdateLeadStatus} />
          )}
        </EmployeeLayout>
        </SubscriptionGuard>
      </ProtectedRoute>
    );
  }

  if (pathname === '/billing/return') {
    return <ProtectedRoute allowedRole="owner"><BillingReturnPage /></ProtectedRoute>;
  }

  // 4. Owner Routes (Executive CRM)
  return (
    <ProtectedRoute allowedRole="owner">
      <SubscriptionGuard>
      <OwnerLayout leads={leads} onSelectLead={setSelectedLead}>
        {pathname === '/dashboard' || pathname === '/' ? (
          <OwnerDashboardPage leads={leads} onSelectLead={setSelectedLead} />
        ) : pathname === '/leads' ? (
          <OwnerLeadsPage
            leads={leads}
            employees={employees}
            selectedLead={selectedLead}
            onSelectLead={setSelectedLead}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onUpdateLead={handleUpdateLead}
            onAddLead={handleAddLead}
          />
        ) : pathname === '/projects' ? (
          <OwnerProjectsPage leads={leads} onSelectLead={setSelectedLead} />
        ) : isPilotUnavailablePath(pathname) ? (
          <PilotUnavailablePage />
        ) : pathname === '/employees' ? (
          <OwnerEmployeesPage
            employees={employees}
            leads={leads}
            onEmployeeAdded={() => {
              fetchEmployees().then(dbEmp => {
                if (dbEmp && dbEmp.length > 0) setEmployees(dbEmp);
              }).catch(console.error);
            }}
          />
        ) : pathname === '/widget' ? (
          <OwnerWidgetPage onAddLead={handleAddLead} />
        ) : pathname === '/integrations' ? (
          <Integrations leads={leads} employees={employees} onAddLead={handleAddLead} />
        ) : pathname === '/settings' ? (
          <OwnerSettingsPage />
        ) : (
          <OwnerDashboardPage leads={leads} employees={employees} onSelectLead={setSelectedLead} />
        )}
      </OwnerLayout>

      {/* Persistent Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold ${
            toast.type === 'error' ? 'bg-rose-950 text-rose-100 border-rose-800' : 'bg-slate-900 text-white border-slate-700'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${toast.type === 'error' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white font-bold text-xs">✕</button>
          </div>
        </div>
      )}
      </SubscriptionGuard>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-sm font-semibold text-slate-500">Načítám StavbaFlow…</div>}>
        <AppContent />
      </React.Suspense>
    </RouterProvider>
  );
}
