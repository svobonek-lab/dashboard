import React, { useState, useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';
import { generateRealisticLeads, generateRealisticEmployees } from '@/lib/demoData';
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
  const { branding, updateBranding } = useBranding();
  const { 
    isConfigured, 
    user, 
    dbUser,
    isLoading: isAuthLoading, 
    currentOrg, 
    fetchLeads, 
    fetchEmployees, 
    saveLead, 
    updateLeadStatus 
  } = useOrganization();
  const { pathname, navigate } = useRouter();

  const [leads, setLeads] = useState<Lead[]>(() => generateRealisticLeads(branding));
  const [employees, setEmployees] = useState(() => generateRealisticEmployees());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Synchronize leads & employees from active organization
  useEffect(() => {
    if (currentOrg) {
      Promise.all([fetchLeads(), fetchEmployees()])
        .then(([dbLeads, dbEmployees]) => {
          if (dbLeads.length > 0) {
            setLeads(dbLeads);
          } else {
            const initialLeads = generateRealisticLeads({
              ...branding,
              name: currentOrg.name,
              primaryColor: currentOrg.primary_color
            });
            Promise.all(initialLeads.map(l => saveLead(l)))
              .then(saved => setLeads(saved))
              .catch(() => setLeads(initialLeads));
          }

          if (dbEmployees.length > 0) {
            setEmployees(dbEmployees);
          }
        })
        .catch(err => {
          console.error("Failed to load org data:", err);
        });
    }
  }, [currentOrg]);

  // Root path routing based on user role
  useEffect(() => {
    if (isAuthLoading) return;

    if (pathname === '/') {
      const role = (dbUser?.role as UserRole) || 'owner';
      const target = getDefaultRouteForRole(role);
      navigate(target, { replace: true });
    }
  }, [pathname, isAuthLoading, dbUser, navigate]);

  // Dynamic White Labeling (Browser Title & Favicon Update)
  useEffect(() => {
    if (branding?.name) {
      document.title = `${branding.name} | Stavební OS`;
    } else {
      document.title = 'StavbaCore CRM';
    }

    if (branding?.logoUrl) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = branding.logoUrl;
      document.head.appendChild(link);
    }
  }, [branding?.name, branding?.logoUrl]);

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
    }
    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (e) {
      console.error('Failed to sync status with database', e);
    }
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
    saveLead(updatedLead).catch(e => console.error('Failed to save lead', e));
  };

  const handleAddLead = (newLead: Lead) => {
    setLeads(prev => [newLead, ...prev]);
    saveLead(newLead).catch(e => console.error('Failed to save lead', e));
  };

  // 1. Standalone / Public / Embed Routes (No Layout)
  if (pathname === '/widget-iframe' || pathname === '/widget-iframe.html') {
    return <WidgetIframePage />;
  }

  if (pathname === '/inquiry' || pathname === '/poptavka') {
    return (
      <InquiryFormPage 
        branding={branding} 
        onSubmitInquiry={handleAddLead}
        onBackToDashboard={() => navigate('/dashboard')} 
      />
    );
  }

  if (pathname === '/portal') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <CustomerPortalPage branding={branding} lead={leads[0]} onBackToCRM={() => navigate('/dashboard')} />
      </div>
    );
  }

  if (pathname === '/login') {
    return <LoginPage onSuccess={() => {
      const role = (dbUser?.role as UserRole) || 'owner';
      navigate(getDefaultRouteForRole(role), { replace: true });
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
            <InstallStudio currentBranding={branding} onDeploy={(b) => updateBranding(b)} />
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
      <ProtectedRoute allowedRole={['employee', 'owner', 'super_admin']}>
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
          <OwnerEmployeesPage employees={employees} />
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
        ) : pathname === '/settings' ? (
          <OwnerSettingsPage />
        ) : (
          <OwnerDashboardPage leads={leads} onSelectLead={setSelectedLead} />
        )}
      </OwnerLayout>
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
