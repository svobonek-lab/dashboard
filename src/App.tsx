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
    const activeName = currentOrg?.name || branding.name || 'StavbaCore CRM';
    document.title = `${activeName} | Stavební OS`;

    const activeLogo = currentOrg?.logo_url || branding.logoUrl;
    if (activeLogo) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = activeLogo;
      document.head.appendChild(link);
    }
  }, [currentOrg?.name, currentOrg?.logo_url, branding?.name, branding?.logoUrl]);

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

  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'LEAD_CREATED') {
        handleAddLead(e.data.payload);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [employees]);

  const handleAddLead = (incoming: any) => {
    const customerName = incoming.fullName || incoming.customerName || incoming.title || 'Nová poptávka';
    const newLead: Lead = {
      id: incoming.id || `lead-${Date.now()}`,
      title: incoming.title || `${incoming.projectType || 'Projekt'} - ${customerName}`,
      customerName: customerName,
      customerPhone: incoming.phone || incoming.customerPhone || '',
      customerEmail: incoming.email || incoming.customerEmail || '',
      city: incoming.city || currentOrg?.city || 'Praha',
      address: incoming.address || `${currentOrg?.city || 'Praha'}`,
      preferredDate: incoming.preferredDate || new Date().toISOString().substring(0, 10),
      price: Number(incoming.price || incoming.budgetValue) || 220000,
      status: (incoming.status as LeadStatus) || 'New',
      priority: (incoming.priority as any) || 'Medium',
      assignedEmployeeId: incoming.assignedEmployeeId || (employees[0]?.id || 'emp-1'),
      assignedEmployeeName: incoming.assignedEmployeeName || (employees[0]?.name || 'Dispečink'),
      thumbnail: incoming.thumbnail || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
      photos: incoming.photos || [],
      files: incoming.files || [],
      createdDate: incoming.createdDate || new Date().toLocaleDateString('cs-CZ'),
      urgency: incoming.urgency || 'Medium',
      description: incoming.description || 'Poptávka z webového formuláře',
      timeline: incoming.timeline && incoming.timeline.length > 0 ? incoming.timeline : [
        {
          id: 't-1',
          title: 'Poptávka odeslána z webu',
          date: new Date().toLocaleDateString('cs-CZ'),
          time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
          completed: true,
          description: 'Zákazník odeslal online poptávku s kontaktními údaji.'
        }
      ],
      checklist: incoming.checklist && incoming.checklist.length > 0 ? incoming.checklist : [
        { id: 'c-1', text: 'Zkontrolovat kontaktní údaje a ověřit telefon', completed: false, required: true },
        { id: 'c-2', text: 'Zpracovat cenovou kalkulaci', completed: false, required: true },
        { id: 'c-3', text: 'Domluvit termín zaměření na místě', completed: false, required: false }
      ],
      aiSummary: incoming.aiSummary || {
        jobType: incoming.projectType || 'Zakázka',
        complexity: 'Medium',
        estimatedRange: `${Number(incoming.price || incoming.budgetValue || 220000).toLocaleString('cs-CZ')} Kč`,
        assignedEmployee: employees[0]?.name || 'Dispečink',
        risks: ['Ověřit terénní přístup a inženýrské sítě'],
        recommendedNextStep: 'Telefonický kontakt zákazníka do 24 hodin.'
      },
      aiChat: incoming.aiChat || [],
      history: incoming.history && incoming.history.length > 0 ? incoming.history : [
        {
          id: 'h-' + Date.now(),
          timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
          action: 'Poptávka přijata do CRM',
          author: 'Webový formulář'
        }
      ],
      voiceNotes: incoming.voiceNotes || (incoming.voiceNoteText ? [
        {
          id: 'vn-1',
          timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
          text: incoming.voiceNoteText,
          duration: '0:15'
        }
      ] : [])
    };

    setLeads(prev => [newLead, ...prev.filter(l => l.id !== newLead.id)]);
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
    return <LoginPage onSuccess={(user) => {
      if (user?.role) {
         navigate(getDefaultRouteForRole(user.role), { replace: true });
      } else {
         navigate('/', { replace: true });
      }
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
            <InstallStudio currentBranding={branding} onDeploy={(b) => updateBrandingAdmin(currentOrg?.id || "", b.name, b.primaryColor, b.logoUrl)} />
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
