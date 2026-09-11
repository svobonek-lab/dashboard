import React, { useState, useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';
import { generateRealisticLeads, generateRealisticEmployees } from '@/lib/demoData';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AuditCard } from '@/components/AuditCard';
import { DemoGeneratorModal } from '@/components/DemoGeneratorModal';
import { OnboardingWizardModal } from '@/components/OnboardingWizardModal';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { VoiceNotesModal } from '@/components/VoiceNotesModal';
import { CommandPalette } from '@/components/CommandPalette';
import { FloatingAIAssistant } from '@/components/FloatingAIAssistant';

import { OwnerDashboard } from '@/features/OwnerDashboard';
import { EmployeeDashboard } from '@/features/EmployeeDashboard';
import { LeadsKanban } from '@/features/LeadsKanban';
import { LeadDetail } from '@/features/LeadDetail';
import { CalendarView } from '@/features/CalendarView';
import { EmployeesPage } from '@/features/EmployeesPage';
import { QuotesPage } from '@/features/QuotesPage';
import { DocumentsPage } from '@/features/DocumentsPage';
import { AnalyticsPage } from '@/features/AnalyticsPage';
import { MapView } from '@/features/MapView';
import { InquiryFormPage } from '@/features/InquiryFormPage';
import { CustomerPortalPage } from '@/features/CustomerPortalPage';
import { CommunicationCenterPage } from '@/features/CommunicationCenterPage';
import { EmbedWidgetPage } from '@/features/EmbedWidgetPage';
import { InstallStudio } from '@/features/InstallStudio';
import { AdminPanel } from '@/features/AdminPanel';
import { WidgetIframePage } from '@/features/WidgetIframePage';
import { ConstructionDashboard } from '@/components/ConstructionDashboard';

import { Lead, WebsiteAudit, LeadStatus, CRMNotification, CompanyBranding } from '@/types';
import { Download, X, Check, FileArchive } from 'lucide-react';

import { useOrganization } from '@/context/OrganizationContext';
import { LoginPage } from '@/components/LoginPage';

export default function App() {
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
    updateLeadStatus,
    impersonatingOrgId,
    stopImpersonation,
    schemaError
  } = useOrganization();
  const [leads, setLeads] = useState<Lead[]>(() => generateRealisticLeads(branding));
  const [employees, setEmployees] = useState(() => generateRealisticEmployees());
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Synchronize path and protect routes
  useEffect(() => {
    if (isAuthLoading) return;
    
    // If user is authenticated and visited /login, redirect to main CRM view
    if (user && currentPath === '/login') {
      window.history.pushState(null, '', '/');
      setCurrentPath('/');
    }
    // If user is unauthenticated, and Supabase is configured, and they are not on /login, redirect to /login
    else if (!user && isConfigured && currentPath !== '/login' && currentPath !== '/widget-iframe' && currentPath !== '/widget-iframe.html') {
      window.history.pushState(null, '', '/login');
      setCurrentPath('/login');
    }
  }, [user, isConfigured, currentPath, isAuthLoading]);

  // Support back/forward browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize leads and employees with Supabase when currentOrg changes
  useEffect(() => {
    if (currentOrg) {
      setIsSyncing(true);
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
          } else {
            const initialEmployees = generateRealisticEmployees();
            setEmployees(initialEmployees);
          }
        })
        .catch(err => {
          console.error('Error loading Supabase data, falling back to mock:', err);
          setLeads(generateRealisticLeads(branding));
          setEmployees(generateRealisticEmployees());
        })
        .finally(() => {
          setIsSyncing(false);
        });
    } else {
      setLeads(generateRealisticLeads(branding));
      setEmployees(generateRealisticEmployees());
    }
  }, [currentOrg]);


  const [currentTab, setCurrentTab] = useState('construction');
  const [activeRole, setActiveRole] = useState<'owner' | 'employee'>('owner');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Flow states
  const [showAudit, setShowAudit] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isExportZipModalOpen, setIsExportZipModalOpen] = useState(false);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if typing in input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCurrentTab('leads');
        setSelectedLead(null);
      } else if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setCurrentTab('quotes');
        setSelectedLead(null);
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCurrentTab('calendar');
        setSelectedLead(null);
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setCurrentTab('employees');
        setSelectedLead(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notifications State
  const [notifications, setNotifications] = useState<CRMNotification[]>([
    { id: 'n-1', title: 'Project Accepted', message: 'Martin Kovář accepted Roof Project assignment.', timestamp: '10 mins ago', read: false, type: 'lead' },
    { id: 'n-2', title: 'New Inquiry Received', message: 'Ing. Jan Svoboda submitted a new pergola inquiry.', timestamp: '1 hour ago', read: false, type: 'lead' },
    { id: 'n-3', title: 'Quote Sent', message: 'Quote Q-2026-0492 sent to Marta Dvořáková.', timestamp: '3 hours ago', read: true, type: 'quote' }
  ]);

  const [currentAudit, setCurrentAudit] = useState<WebsiteAudit>({
    url: 'https://novakstavby.cz',
    companyName: branding.name,
    score: 63,
    websiteUxScore: 75,
    leadCaptureScore: 45,
    responseAutomationScore: 20,
    customerExperienceScore: 70,
    googleReviewsRating: 4.8,
    googleReviewsCount: 142,
    googleReviewsSummary: 'Vysoké hodnocení za kvalitu tesařských a pergolových prací, avšak občasné stížnosti na rychlost nacenění a úvodní komunikace.',
    issues: [
      { id: 'iss-1', title: 'Chybějící interaktivní lead formulář', description: 'Web nemá rychlý poptávkový formulář pro okamžitý sběr poptávek.', severity: 'error', category: 'lead', whyItHurts: 'Zákazníci odcházejí ke konkurenci, pokud nemohou ihned poptat cenu.', howWeFixIt: 'Nainstalujeme náš interaktivní formulář a lead widget s okamžitým zpracováním.', timeSaved: '4 hodiny / týdně' },
      { id: 'iss-2', title: 'Žádné automatické potvrzení klientům', description: 'Zákazníci čekají dny na odpověď bez automatické potvrzovací SMS či e-mailu.', severity: 'warning', category: 'automation', whyItHurts: 'Leady vychladnou a hledají mezitím jiné firmy na trhu.', howWeFixIt: 'SMS a WhatsApp potvzení do 10 sekund přes automatizovaný dispečink.', timeSaved: '6 hodin / týdně' },
      { id: 'iss-3', title: 'Chybí klientská fotogalerie před/po', description: 'Na webu chybí moderní vizuální ukázky realizovaných projektů.', severity: 'warning', category: 'ux', whyItHurts: 'Nízká důvěryhodnost kvůli absenci ověřených dokončených staveb.', howWeFixIt: 'Připojíme automaticky synchronizovaný klientský portál s fotkami z terénu.', timeSaved: '3 hodiny / týdně' }
    ],
    recommendations: [
      { id: 'rec-1', title: 'Instalovat interaktivní AI Lead Widget', description: 'Nasazení plovoucího poptávkového asistenta pro okamžitý výpočet odhadu ceny a sběr kontaktů.', impact: 'High', effort: 'Easy', category: 'lead' },
      { id: 'rec-2', title: 'Aktivovat okamžité SMS potvrzení', description: 'Nastavení automatizovaného workflow, které novému kontaktu odešle SMS do 30 sekund.', impact: 'High', effort: 'Easy', category: 'automation' },
      { id: 'rec-3', title: 'Vytvořit klientské portály s fotodokumentací', description: 'Spustit sdílené složky před/po s klienty, kde technici fotí průběh prací mobilem.', impact: 'Medium', effort: 'Medium', category: 'cx' }
    ],
    upgradedBenefits: [
      'Zvýšení konverze poptávek o +34% díky okamžitému AI widgetu',
      'Automatické přiřazování řemeslníků podle kapacity a lokality',
      'Profesionální PDF rozpočty a klientský portál s fotodokumentací'
    ]
  });

  // Modals
  const [lightboxData, setLightboxData] = useState<{ isOpen: boolean; url: string; title: string; category?: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const handleDemoGenerated = (newBranding: any, newAudit: WebsiteAudit) => {
    updateBranding(newBranding);
    setCurrentAudit(newAudit);
    setLeads(generateRealisticLeads(newBranding));
    setEmployees(generateRealisticEmployees(newBranding.city));
    setSelectedLead(null);
    setIsDemoModalOpen(false);
    setShowAudit(true);

    // Add celebration notification
    const newNotif: CRMNotification = {
      id: 'notif-' + Date.now(),
      title: `Personalizované CRM vygenerováno`,
      message: `Prostředí pro firmu ${newBranding.name} v lokalitě ${newBranding.city} bylo úspěšně vytvořeno s reálnými zakázkami a rozpočty.`,
      timestamp: 'Právě teď',
      read: false,
      type: 'system'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (e) {
      console.error('Failed to sync status update to Supabase', e);
    }
  };

  const handleUpdateLead = async (updated: Lead) => {
    setLeads(leads.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
    try {
      await saveLead(updated);
    } catch (e) {
      console.error('Failed to sync lead update to Supabase', e);
    }
  };

  const handleSaveVoiceNote = (note: { duration: string; transcript: string }) => {
    if (!selectedLead) return;
    const newNote = {
      id: 'vn-' + Date.now(),
      duration: note.duration,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      transcript: note.transcript
    };
    const updated = {
      ...selectedLead,
      voiceNotes: [...(selectedLead.voiceNotes || []), newNote]
    };
    handleUpdateLead(updated);
  };

  const handleCreateLeadFromVoice = async (parsed: any) => {
    const newLead: Lead = {
      id: 'lead-' + Date.now(),
      title: `${parsed.projectType} - ${parsed.customerName}`,
      description: parsed.notes,
      city: branding.city || 'Praha',
      address: `Na Stavbě 14, ${branding.city || 'Praha'}`,
      customerName: parsed.customerName,
      customerPhone: parsed.phone,
      customerEmail: 'klient@email.cz',
      preferredDate: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      price: parsed.budget,
      status: 'New' as any,
      priority: 'High' as any,
      assignedEmployeeId: employees[0]?.id || 'emp-1',
      assignedEmployeeName: employees[0]?.name || 'Petr Novotný',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      photos: [],
      files: [],
      checklist: (parsed.checklist || []).map((text: string, i: number) => ({
        id: `chk-${Date.now()}-${i}`,
        text,
        completed: false
      })),
      aiSummary: {
        jobType: parsed.projectType,
        complexity: 'Medium' as any,
        estimatedRange: `${(parsed.budget * 0.9).toLocaleString()} - ${(parsed.budget * 1.1).toLocaleString()} CZK`,
        assignedEmployee: employees[0]?.name || 'Petr Novotný',
        risks: ['Ověřit stavební připravenost a statiku'],
        recommendedNextStep: 'Zkontaktovat zákazníka a potvrdit zaměření.'
      },
      timeline: [{
        id: 't-1',
        title: 'Zakázka vytvořena z hlasového diktátu AI',
        status: 'Completed',
        timestamp: 'Právě teď'
      }],
      aiChat: [],
      history: [],
      voiceNotes: [{
        id: 'vn-' + Date.now(),
        duration: '0:24',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        transcript: parsed.notes
      }]
    };

    setLeads(prev => [newLead, ...prev]);
    try {
      await saveLead(newLead);
    } catch (e) {
      console.error('Failed to save voice lead to database', e);
    }

    const notif: CRMNotification = {
      id: 'notif-' + Date.now(),
      title: 'Nová zakázka z hlasového diktátu',
      message: `${newLead.title} zařazena do fáze "Nový" na Kanbanu (${newLead.price.toLocaleString()} Kč).`,
      timestamp: 'Právě teď',
      read: false,
      type: 'lead'
    };
    setNotifications(prev => [notif, ...prev]);
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleCompleteOnboarding = (
    updatedBranding: CompanyBranding, 
    updatedEmployees: any[], 
    generatedLeads: Lead[]
  ) => {
    updateBranding(updatedBranding);
    setEmployees(updatedEmployees);
    setLeads(generatedLeads);
    setSelectedLead(null);
    setCurrentTab('dashboard');

    // Add celebration notification
    const welcomeNotif: CRMNotification = {
      id: 'n-' + Date.now(),
      title: 'Pracovní prostředí nakonfigurováno',
      message: `Úspěšně nastaveno pro ${updatedBranding.name} v lokalitě ${updatedBranding.city}. Přidáno ${generatedLeads.length} realistických zakázek.`,
      timestamp: 'Právě teď',
      read: false,
      type: 'lead'
    };
    setNotifications(prev => [welcomeNotif, ...prev]);
  };

  if (currentPath === '/widget-iframe' || currentPath === '/widget-iframe.html') {
    return <WidgetIframePage />;
  }

  if (schemaError && !!(import.meta as any).env?.PROD) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center border border-slate-100 flex flex-col items-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">Kritická chyba databáze</h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              {schemaError}
            </p>
          </div>
          <div className="w-full bg-slate-50 p-4 rounded-2xl text-xs text-left text-slate-500 space-y-1">
            <span className="font-semibold block text-slate-700">Podrobnosti chybového stavu:</span>
            <span>Chybějící tabulky nebo schémata v nakonfigurovaném Supabase projektu (PGRST125).</span>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-slate-800 active:bg-slate-950 transition shadow-lg shadow-slate-900/10 cursor-pointer"
          >
            Zkusit znovu načíst
          </button>
        </div>
      </div>
    );
  }

  if (isAuthLoading && isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 animate-pulse">Ověřování přihlášení...</p>
      </div>
    );
  }

  if (currentPath === '/login' || (!user && isConfigured)) {
    return (
      <LoginPage 
        onSuccess={() => {
          window.history.pushState(null, '', '/');
          setCurrentPath('/');
        }} 
      />
    );
  }

  if (showAudit) {
    return (
      <AuditCard
        audit={currentAudit}
        branding={branding}
        onProceedToCRM={() => setShowAudit(false)}
        onNewURL={() => setIsDemoModalOpen(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* 280px Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedLead(null);
        }}
        branding={branding}
        onOpenDemoGenerator={() => setIsDemoModalOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onExportZip={() => setIsExportZipModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen bg-slate-950">
        {/* Impersonation Alert Banner */}
        {impersonatingOrgId && (
          <div className="bg-amber-500 text-white px-6 py-3.5 flex items-center justify-between text-xs font-bold shadow-md select-none shrink-0 border-b border-amber-600 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">Impersonace</span>
              <span>Nyní spravujete a prohlížíte CRM z pohledu firmy: <strong className="text-white underline">{currentOrg?.name}</strong></span>
            </div>
            <button 
              onClick={() => {
                stopImpersonation();
                setCurrentTab('admin');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-[11px] font-extrabold transition-all border border-slate-950 flex items-center gap-1.5"
            >
              <span>Ukončit impersonaci</span>
              <span>→</span>
            </button>
          </div>
        )}

        <Header
          branding={branding}
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          onOpenDemoGenerator={() => setIsDemoModalOpen(true)}
          onOpenOnboarding={() => setIsOnboardingOpen(true)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className={`flex-1 ${currentTab === 'construction' ? 'p-0 bg-slate-950 text-slate-100' : 'p-8 max-w-7xl w-full mx-auto text-slate-100'}`}>
          {currentTab === 'construction' ? (
            <ConstructionDashboard onBackToMain={() => setCurrentTab('dashboard')} />
          ) : activeRole === 'employee' ? (
            <EmployeeDashboard
              leads={leads}
              branding={branding}
              onOpenVoiceNotes={() => setIsVoiceModalOpen(true)}
              onSelectLead={(l) => setSelectedLead(l)}
            />
          ) : selectedLead ? (
            <LeadDetail
              lead={selectedLead}
              onBack={() => setSelectedLead(null)}
              onOpenPhoto={(url, title, category) => setLightboxData({ isOpen: true, url, title, category })}
              onOpenVoiceNotes={() => setIsVoiceModalOpen(true)}
              onUpdateLead={handleUpdateLead}
            />
          ) : (
            <>
              {currentTab === 'install' && (
                <InstallStudio
                  currentBranding={branding}
                  onDeploy={(newBranding, newEmployees) => {
                    updateBranding(newBranding);
                    if (newEmployees && newEmployees.length > 0) {
                      setEmployees(newEmployees as any);
                    }
                    setCurrentTab('dashboard');
                  }}
                  onClose={() => setCurrentTab('dashboard')}
                />
              )}
              {currentTab === 'inquiry' && (
                <InquiryFormPage
                  branding={branding}
                  onSubmitInquiry={(newInquiry) => {
                    const priceValue = newInquiry.price || newInquiry.budgetValue || 220000;
                    const createdLead: Lead = {
                      id: 'lead-' + Date.now(),
                      title: `${newInquiry.projectType} — ${newInquiry.fullName}`,
                      description: newInquiry.description || 'Nová poptávka z AI formuláře',
                      city: branding.city,
                      address: newInquiry.address,
                      customerName: newInquiry.fullName,
                      customerPhone: newInquiry.phone,
                      customerEmail: newInquiry.email,
                      preferredDate: newInquiry.preferredDate,
                      price: priceValue,
                      status: 'New',
                      priority: 'High',
                      assignedEmployeeId: 'emp-1',
                      assignedEmployeeName: 'Petr Novotný',
                      thumbnail: newInquiry.photos && newInquiry.photos.length > 0 
                        ? newInquiry.photos[0] 
                        : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
                      photos: (newInquiry.photos || []).map((url: string, idx: number) => ({
                        id: `p-${Date.now()}-${idx}`,
                        url,
                        name: `Site Photo ${idx + 1}`,
                        category: 'Inquiry Attachment'
                      })),
                      files: [],
                      checklist: [
                        { id: '1', text: 'Ověřit dostupnost materiálu v centrálním skladu', completed: false },
                        { id: '2', text: 'Potvrdit termín zaměření u zákazníka', completed: false },
                        { id: '3', text: 'Vygenerovat a odeslat položkovou cenovou nabídku', completed: false }
                      ],
                      aiSummary: {
                        jobType: newInquiry.projectType,
                        complexity: newInquiry.aiAnalysis?.complexity || 'Střední složitost',
                        estimatedRange: `${(priceValue * 0.9 / 1000).toFixed(0)}k - ${(priceValue * 1.15 / 1000).toFixed(0)}k CZK`,
                        assignedEmployee: 'Petr Novotný (Tesařský mistr)',
                        risks: ['Předpověď počasí pro venkovní práce'],
                        recommendedNextStep: 'Automatické vytvoření rozpočtu a rezervace materiálu.'
                      },
                      timeline: [
                        { id: '1', title: 'Poptávka přijata z AI formuláře', status: 'Completed', timestamp: 'Právě teď', responsibleEmployee: 'AI Engine', notes: `Poptávka na ${newInquiry.projectType} od ${newInquiry.fullName}` },
                        { id: '2', title: 'AI Scoring & Přiřazení', status: 'Completed', timestamp: 'Právě teď', responsibleEmployee: 'AI Dispatcher', notes: 'Skóre 87/100 • Přiřazen Petr Novotný' }
                      ],
                      aiChat: [],
                      history: [
                        { id: 'h-1', timestamp: 'Právě teď', action: 'Nová poptávka odeslána a zařazena do CRM', author: 'Klient' }
                      ]
                    };
                    setLeads([createdLead, ...leads]);
                    saveLead(createdLead).catch(err => console.error('Failed to save inquiry to Supabase:', err));
                    setNotifications(prev => [
                      {
                        id: 'notif-' + Date.now(),
                        title: `Nová poptávka: ${newInquiry.fullName}`,
                        message: `${newInquiry.projectType} (${(priceValue / 1000).toFixed(0)}k CZK) • Přiřazen Petr Novotný`,
                        timestamp: 'Právě teď',
                        read: false,
                        type: 'lead'
                      },
                      ...prev
                    ]);
                  }}
                  onBackToDashboard={() => setCurrentTab('dashboard')}
                />
              )}
              {currentTab === 'widget' && (
                <EmbedWidgetPage
                  branding={branding}
                  onCreateLeadFromWidget={(newInquiry) => {
                    const priceValue = newInquiry.price || newInquiry.budgetValue || 250000;
                    const createdLead: Lead = {
                      id: 'lead-' + Date.now(),
                      title: `${newInquiry.projectType} — ${newInquiry.fullName}`,
                      description: newInquiry.description || 'Nová poptávka z Embed Widgetu',
                      city: branding.city,
                      address: newInquiry.address,
                      customerName: newInquiry.fullName,
                      customerPhone: newInquiry.phone,
                      customerEmail: newInquiry.email,
                      preferredDate: newInquiry.preferredDate,
                      price: priceValue,
                      status: 'New',
                      priority: 'High',
                      assignedEmployeeId: 'emp-1',
                      assignedEmployeeName: 'Petr Novotný',
                      thumbnail: newInquiry.photos && newInquiry.photos.length > 0 
                        ? newInquiry.photos[0] 
                        : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
                      photos: (newInquiry.photos || []).map((url: string, idx: number) => ({
                        id: `p-${Date.now()}-${idx}`,
                        url,
                        name: `Widget Photo ${idx + 1}`,
                        category: 'Widget Upload'
                      })),
                      files: [],
                      checklist: [
                        { id: '1', text: 'Zkontrolovat data z Embed Widgetu', completed: false },
                        { id: '2', text: 'Ověřit dostupnost materiálu v centrálním skladu', completed: false },
                        { id: '3', text: 'Zaslat PDF rozpočet s digitálním podpisem', completed: false }
                      ],
                      aiSummary: {
                        jobType: newInquiry.projectType,
                        complexity: newInquiry.aiAnalysis?.complexity || 'Střední složitost (4-5 dní)',
                        estimatedRange: `${(priceValue * 0.9 / 1000).toFixed(0)}k - ${(priceValue * 1.15 / 1000).toFixed(0)}k CZK`,
                        assignedEmployee: 'Petr Novotný (Mistr tesař)',
                        risks: ['Kontrola servisního rádiusu a příjezdové cesty'],
                        recommendedNextStep: 'Automatické vystavení cenové nabídky.'
                      },
                      timeline: [
                        { id: '1', title: 'Poptávka přijata z Embed Widgetu', status: 'Completed', timestamp: 'Právě teď', responsibleEmployee: 'Embed Widget CDN', notes: `Poptávka na ${newInquiry.projectType} (${newInquiry.fullName})` },
                        { id: '2', title: 'AI Scoring & Automatické přiřazení', status: 'Completed', timestamp: 'Právě teď', responsibleEmployee: 'AI Engine', notes: 'Skóre 87/100 • Přiřazen Petr Novotný' }
                      ],
                      aiChat: [],
                      history: [
                        { id: 'h-1', timestamp: 'Právě teď', action: 'Poptávka přijata přes Embed Widget na webu', author: 'Webový formulář' }
                      ]
                    };
                    setLeads([createdLead, ...leads]);
                    saveLead(createdLead).catch(err => console.error('Failed to save widget inquiry to Supabase:', err));
                    setNotifications(prev => [
                      {
                        id: 'notif-' + Date.now(),
                        title: `Nová poptávka z webu: ${newInquiry.fullName}`,
                        message: `${newInquiry.projectType} (${(priceValue / 1000).toFixed(0)}k CZK) • SMS a e-mail potvrzeny`,
                        timestamp: 'Právě teď',
                        read: false,
                        type: 'lead'
                      },
                      ...prev
                    ]);
                  }}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                />
              )}
              {currentTab === 'portal' && (
                <CustomerPortalPage
                  branding={branding}
                  lead={leads[0]}
                  onBackToCRM={() => setCurrentTab('dashboard')}
                />
              )}
              {currentTab === 'communication' && (
                <CommunicationCenterPage
                  branding={branding}
                  leads={leads}
                />
              )}
              {currentTab === 'admin' && dbUser?.role === 'super_admin' && <AdminPanel />}
              {currentTab === 'admin' && dbUser?.role !== 'super_admin' && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 max-w-lg mx-auto my-12">
                  <span className="font-semibold text-lg text-red-800">Přístup odepřen</span>
                  <p className="text-sm text-red-600">Nemáte dostatečná oprávnění k zobrazení této stránky. Tato sekce je vyhrazena pouze pro super administrátory systému.</p>
                </div>
              )}
              {currentTab === 'dashboard' && (
                <OwnerDashboard
                  branding={branding}
                  leads={leads}
                  onSelectLead={(l) => setSelectedLead(l)}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                />
              )}
              {currentTab === 'leads' && (
                <LeadsKanban
                  leads={leads}
                  onSelectLead={(l) => setSelectedLead(l)}
                  onUpdateLeadStatus={handleUpdateLeadStatus}
                />
              )}
              {currentTab === 'map' && (
                <MapView
                  leads={leads}
                  branding={branding}
                  onSelectLead={(l) => setSelectedLead(l)}
                />
              )}
              {currentTab === 'calendar' && <CalendarView leads={leads} />}
              {currentTab === 'employees' && <EmployeesPage employees={employees} branding={branding} />}
              {currentTab === 'quotes' && <QuotesPage branding={branding} />}
              {currentTab === 'documents' && <DocumentsPage branding={branding} />}
              {currentTab === 'analytics' && <AnalyticsPage branding={branding} />}
              {currentTab === 'settings' && (
                <div className="space-y-6 max-w-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-100">Branding & System Settings</h2>
                      <p className="text-xs text-slate-400">Správa identity systému a možnosti exportu projektu.</p>
                    </div>
                    <button
                      onClick={() => setIsExportZipModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exportovat projekt (ZIP)</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300">Company Name</label>
                      <input type="text" readOnly value={branding.name} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-semibold text-slate-100" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300">Primary Branding Color</label>
                      <div className="flex items-center gap-3 mt-1">
                        <input type="color" value={branding.primaryColor} disabled className="w-12 h-10 rounded-xl border border-slate-800 cursor-pointer bg-slate-950" />
                        <span className="font-mono text-xs text-slate-300">{branding.primaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300">Services</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(branding?.services || []).map((s: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700/60 rounded-lg text-xs font-medium text-slate-200">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ZIP Export Card */}
                  <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <FileArchive className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Stažení celého projektu (ZIP / GitHub)</h3>
                        <p className="text-xs text-slate-400">Jak stáhnout kompletní zdrojový kód se všemi komponentami a daty.</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Ano! Celý projekt lze okamžitě stáhnout ve formátu <strong>.ZIP</strong> přímo z rozhraní Google AI Studio:
                    </p>

                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                        <span>V pravém horním rohu Google AI Studio klikněte na ikonu <strong>Settings / Export</strong>.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                        <span>Zvolte možnost <strong>Export to ZIP</strong> nebo propojte přímo se svým <strong>GitHub</strong> repozitářem.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                        <span>Archiv obsahuje kompletní Vite + React + TypeScript kód připravený k okamžitému spuštění přes <code>npm install && npm run dev</code>.</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsExportZipModalOpen(true)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Zobrazit podrobný návod ke stažení ZIP</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant branding={branding} leads={leads} />

      {/* Modals & Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          setSelectedLead(null);
        }}
        onSelectLead={(l) => setSelectedLead(l)}
        leads={leads}
        branding={branding}
      />

      <DemoGeneratorModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onDemoGenerated={handleDemoGenerated}
      />

      <OnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        currentBranding={branding}
        onCompleteOnboarding={handleCompleteOnboarding}
      />

      <PhotoLightbox
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.url}
        title={lightboxData.title}
        category={lightboxData.category}
        onClose={() => setLightboxData({ isOpen: false, url: '', title: '' })}
      />

      <VoiceNotesModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSaveNote={handleSaveVoiceNote}
        onCreateLeadFromVoice={handleCreateLeadFromVoice}
        hasActiveLead={!!selectedLead}
      />

      {/* Export Project ZIP Modal */}
      {isExportZipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl relative space-y-5 animate-in fade-in">
            <button
              onClick={() => setIsExportZipModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Stažení celého projektu (ZIP)</h3>
                <p className="text-xs text-slate-400">Jak získat kompletní zdrojový kód z Google AI Studio</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-amber-400 font-bold flex items-center gap-1.5 text-xs">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Ano, projekt můžete kdykoliv stáhnout jako ZIP!
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  V rozhraní Google AI Studio je vestavěná funkce pro kompletní export projektu. Nemusíte nic kopírovat ručně.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs">Menu Nastavení vpravo nahoře</h4>
                    <p className="text-[11px] text-slate-400">Klikněte na ikonu ozubeného kola (Settings) nebo tlačítko v pravém horním panelu AI Studia.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs">Zvolte "Export to ZIP" nebo "Export to GitHub"</h4>
                    <p className="text-[11px] text-slate-400">Stáhne se standardní archiv .zip obsahující package.json, TypeScript komponenty a konfiguraci.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs">Lokální spuštění projektu</h4>
                    <p className="text-[11px] text-slate-400">Rozbalte ZIP a ve složce spusťte příkazy:</p>
                    <code className="block mt-1.5 p-2 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px]">
                      npm install && npm run dev
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsExportZipModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Rozumím, zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
