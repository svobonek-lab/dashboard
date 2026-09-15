import React, { useState, useEffect } from 'react';
import { generateRealisticLeads, generateRealisticEmployees } from '@/lib/demoData';
import { DEFAULT_DEMO_ORG_ID } from '@/lib/supabase';
import { useOrganization } from '@/context/OrganizationContext';
import { RouterProvider, useRouter } from './app/router';
import { ProtectedRoute } from './app/ProtectedRoute';
import { RoleGuard } from './app/RoleGuard';
import { getDefaultRouteForRole, UserRole } from './app/permissions';

// Layouts
import { SuperAdminLayout } from './layouts/SuperAdminLayout';
import { OwnerLayout } from './layouts/OwnerLayout';
import { EmployeeLayout } from './layouts/EmployeeLayout';

// Super Admin Pages
import { AdminDashboardPage } from './pages/admin/Dashboard';
import { AdminCompaniesPage } from './pages/admin/Companies';
import { AdminBillingPage } from './pages/admin/Billing';
import { AdminDomainsPage } from './pages/admin/Domains';
import { AdminLogsPage } from './pages/admin/Logs';
import { InstallStudio } from '@/features/InstallStudio';
import { AdminPanel } from '@/features/AdminPanel';

// Owner Pages
import { OwnerDashboardPage } from './pages/owner/Dashboard';
import { OwnerLeadsPage } from './pages/owner/Leads';
import { OwnerProjectsPage } from './pages/owner/Projects';
import { OwnerCalendarPage } from './pages/owner/Calendar';
import { OwnerEmployeesPage } from './pages/owner/Employees';
import { OwnerAnalyticsPage } from './pages/owner/Analytics';
import { OwnerQuotesPage } from './pages/owner/Quotes';
import { OwnerDocumentsPage } from './pages/owner/Documents';
import { OwnerCommunicationPage } from './pages/owner/Communication';
import { OwnerWidgetPage } from './pages/owner/Widget';
import { OwnerSettingsPage } from './pages/owner/Settings';
import { Integrations } from './pages/owner/Integrations';
import { SynologyNAS } from './pages/owner/SynologyNAS';

// Employee Pages
import { EmployeeDashboardPage } from './pages/employee/Dashboard';
import { EmployeeJobsPage } from './pages/employee/Jobs';
import { EmployeeSchedulePage } from './pages/employee/Schedule';
import { EmployeeMapPage } from './pages/employee/Map';
import { EmployeePhotosPage } from './pages/employee/Photos';
import { EmployeeChecklistPage } from './pages/employee/Checklist';
import { EmployeeProfilePage } from './pages/employee/Profile';

// Public & Embed Views
import { LoginPage } from '@/components/LoginPage';
import { WidgetIframePage } from '@/features/WidgetIframePage';
import { InquiryFormPage } from '@/features/InquiryFormPage';
import { CustomerPortalPage } from '@/features/CustomerPortalPage';

// Types
import { Lead, LeadStatus } from '@/types';

function AppContent() {
  const { currentOrg } = useOrganization();
  const branding = currentOrg?.branding || {};
  
  
  const { updateBrandingAdmin, isConfigured, 
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

  const isDemoOrg = currentOrg?.id === DEFAULT_DEMO_ORG_ID || currentOrg?.slug === 'pergoly-praha';
  const [leads, setLeads] = useState<Lead[]>(() => isDemoOrg ? generateRealisticLeads(branding) : []);
  const [employees, setEmployees] = useState(() => isDemoOrg ? generateRealisticEmployees() : []);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Synchronize leads & employees from active organization
  useEffect(() => {
    if (currentOrg) {
      const isDemo = currentOrg.id === DEFAULT_DEMO_ORG_ID || currentOrg.slug === 'pergoly-praha';
      Promise.all([fetchLeads(), fetchEmployees()])
        .then(([dbLeads, dbEmployees]) => {
          if (dbLeads.length > 0) {
            setLeads(dbLeads);
          } else if (isDemo) {
            const initialLeads = generateRealisticLeads({
              ...branding,
              name: currentOrg.name,
              primaryColor: currentOrg.primary_color
            });
            Promise.all(initialLeads.map(l => saveLead(l)))
              .then(saved => setLeads(saved))
              .catch(() => setLeads(initialLeads));
          } else {
            setLeads([]);
          }

          if (dbEmployees.length > 0) {
            setEmployees(dbEmployees);
          } else if (isDemo) {
            setEmployees(generateRealisticEmployees());
          } else {
            setEmployees([]);
          }
        })
        .catch(err => {
          console.error("Failed to load org data:", err);
        });
    }
  }, [currentOrg]);

  // Root path routing & strict employee route protection
  useEffect(() => {
    if (isAuthLoading) return;

    if (pathname === '/') {
      const role = (dbUser?.role as UserRole) || 'owner';
      const target = getDefaultRouteForRole(role);
      navigate(target, { replace: true });
    } else if (dbUser?.role === 'employee') {
      const isAllowedEmployeePath = pathname.startsWith('/employee') || pathname === '/login' || pathname === '/portal' || pathname.startsWith('/widget-iframe');
      if (!isAllowedEmployeePath) {
        navigate('/employee', { replace: true });
      }
    }
  }, [pathname, isAuthLoading, dbUser, navigate]);

  // Dynamic White Labeling (Browser Title & Favicon Update)
  useEffect(() => {
    const activeName = currentOrg?.name || 'StavbaCore CRM';
    document.title = `${activeName} | Stavební OS`;

    const activeLogo = currentOrg?.logo_url;
    if (activeLogo) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = activeLogo;
      document.head.appendChild(link);
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
    const targetLead = leads.find(l => l.id === leadId);
    if (!targetLead) return;
    const previousStatus = targetLead.status;
    if (previousStatus === newStatus) return;

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const timestamp = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

    // 1. Optimistic Update (Immediate UI update, timeline update, history update, counter recalculation)
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

    setLeads(prev => prev.map(l => l.id === leadId ? {
      ...l,
      status: newStatus,
      history: updatedHistory,
      timeline: updatedTimeline
    } : l));

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => prev ? {
        ...prev,
        status: newStatus,
        history: updatedHistory,
        timeline: updatedTimeline
      } : null);
    }

    showToast(`Stav zakázky "${targetLead.customerName}" změněn na: ${statusLabel}`, 'success');

    // 2. Persist to cache & database with optimistic rollback on failure
    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (e: any) {
      console.error('Failed to sync status with database, rolling back', e);
      // Rollback on failure
      setLeads(prev => prev.map(l => l.id === leadId ? targetLead : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(targetLead);
      }
      showToast('Nepodařilo se uložit změnu stavu. Změna byla stornována.', 'error');
    }
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
    saveLead(updatedLead).catch(e => console.error('Failed to save lead', e));
  };

  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'LEAD_CREATED' && e.data?.payload) {
        const incomingLead = e.data.payload;
        setLeads(prev => [incomingLead, ...prev.filter(l => l.id !== incomingLead.id)]);
      }
    };
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
    window.addEventListener('message', handleMessage);
    window.addEventListener('crm:lead_created', handleCrmLeadCreated as EventListener);
    window.addEventListener('crm:toast', handleCrmToast as EventListener);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('crm:lead_created', handleCrmLeadCreated as EventListener);
      window.removeEventListener('crm:toast', handleCrmToast as EventListener);
    };
  }, []);

  const handleAddLead = async (incoming: any) => {
    try {
      const created = await createLead(incoming);
      setLeads(prev => [created, ...prev.filter(l => l.id !== created.id)]);
    } catch (e) {
      console.error('Failed to add lead via unified createLead pipeline', e);
    }
  };

  const activeBranding = {
    ...branding,
    name: currentOrg?.name || branding.name,
    logoUrl: currentOrg?.logo_url || branding.logoUrl,
    primaryColor: currentOrg?.primary_color || branding.primaryColor,
    city: currentOrg?.city || branding.city
  };

  // 1. Standalone / Public / Embed Routes (No Layout)
  if (pathname === '/widget-iframe' || pathname === '/widget-iframe.html') {
    return <WidgetIframePage />;
  }

  if (pathname === '/inquiry' || pathname === '/poptavka') {
    return (
      <InquiryFormPage 
        branding={activeBranding} 
        onSubmitInquiry={handleAddLead}
        onBackToDashboard={() => navigate('/dashboard')} 
      />
    );
  }

  if (pathname === '/portal') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <CustomerPortalPage branding={activeBranding} lead={leads[0]} onBackToCRM={() => navigate('/dashboard')} />
      </div>
    );
  }

  if (pathname === '/login') {
    return <LoginPage onSuccess={(user) => {
      const targetRole = user?.role || dbUser?.role || 'owner';
      navigate(getDefaultRouteForRole(targetRole), { replace: true });
    }} />;
  }

  // 2. Super Admin Routes (`/admin*`)
  if (pathname.startsWith('/admin')) {
    return (
      <ProtectedRoute allowedRole="super_admin">
        <SuperAdminLayout>
          {pathname === '/admin' || pathname === '/admin/dashboard' ? (
            <AdminDashboardPage />
          ) : pathname === '/admin/companies' ? (
            <AdminCompaniesPage />
          ) : pathname === '/admin/install' ? (
            <InstallStudio currentBranding={activeBranding} onDeploy={(b) => updateBrandingAdmin(currentOrg?.id || "", b.name, b.primaryColor, b.logoUrl)} />
          ) : pathname === '/admin/demo-creator' ? (
            <AdminPanel />
          ) : pathname === '/admin/domains' ? (
            <AdminDomainsPage />
          ) : pathname === '/admin/billing' ? (
            <AdminBillingPage />
          ) : pathname === '/admin/logs' ? (
            <AdminLogsPage />
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
      <ProtectedRoute allowedRole={['employee', 'super_admin']}>
        <EmployeeLayout leads={leads}>
          {pathname === '/employee' || pathname === '/employee/dashboard' ? (
            <EmployeeDashboardPage leads={leads} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} />
          ) : pathname === '/employee/jobs' ? (
            <EmployeeJobsPage leads={leads} onSelectLead={setSelectedLead} />
          ) : pathname === '/employee/schedule' ? (
            <EmployeeSchedulePage leads={leads} />
          ) : pathname === '/employee/map' ? (
            <EmployeeMapPage leads={leads} onSelectLead={setSelectedLead} />
          ) : pathname === '/employee/photos' ? (
            <EmployeePhotosPage leads={leads} onUpdateLead={handleUpdateLead} />
          ) : pathname === '/employee/checklist' ? (
            <EmployeeChecklistPage leads={leads} onUpdateLead={handleUpdateLead} />
          ) : pathname === '/employee/messages' ? (
            <OwnerCommunicationPage leads={leads} />
          ) : pathname === '/employee/profile' ? (
            <EmployeeProfilePage />
          ) : (
            <EmployeeDashboardPage leads={leads} onSelectLead={setSelectedLead} onUpdateLead={handleUpdateLead} />
          )}
        </EmployeeLayout>
      </ProtectedRoute>
    );
  }

  // 4. Owner Routes (Executive CRM)
  return (
    <ProtectedRoute allowedRole={['owner', 'super_admin']}>
      <OwnerLayout leads={leads} onSelectLead={setSelectedLead}>
        {pathname === '/dashboard' || pathname === '/' ? (
          <OwnerDashboardPage leads={leads} onSelectLead={setSelectedLead} />
        ) : pathname === '/leads' ? (
          <OwnerLeadsPage 
            leads={leads} 
            selectedLead={selectedLead} 
            onSelectLead={setSelectedLead} 
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onUpdateLead={handleUpdateLead}
            onAddLead={handleAddLead}
          />
        ) : pathname === '/projects' ? (
          <OwnerProjectsPage leads={leads} onSelectLead={setSelectedLead} />
        ) : pathname === '/calendar' ? (
          <OwnerCalendarPage leads={leads} />
        ) : pathname === '/employees' ? (
          <OwnerEmployeesPage 
            employees={employees} 
            onEmployeeAdded={() => {
              fetchEmployees().then(dbEmp => {
                if (dbEmp && dbEmp.length > 0) setEmployees(dbEmp);
              }).catch(console.error);
            }} 
          />
        ) : pathname === '/analytics' ? (
          <OwnerAnalyticsPage />
        ) : pathname === '/quotes' ? (
          <OwnerQuotesPage />
        ) : pathname === '/documents' ? (
          <OwnerDocumentsPage />
        ) : pathname === '/communication' ? (
          <OwnerCommunicationPage leads={leads} />
        ) : pathname === '/widget' ? (
          <OwnerWidgetPage onAddLead={handleAddLead} />
        ) : pathname === '/integrations' ? (
          <Integrations leads={leads} employees={employees} onAddLead={handleAddLead} />
        ) : pathname === '/integrations/synology' ? (
          <SynologyNAS leads={leads} employees={employees} onAddLead={handleAddLead} />
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
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}
