import React, { useState, useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';
import { generateRealisticLeads, generateRealisticEmployees } from '@/lib/demoData';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AuditCard } from '@/components/AuditCard';
import { DemoGeneratorModal } from '@/components/DemoGeneratorModal';
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

import { Lead, WebsiteAudit, LeadStatus, CRMNotification } from '@/types';

export default function App() {
  const { branding, updateBranding } = useBranding();
  const [leads, setLeads] = useState<Lead[]>(() => generateRealisticLeads(branding));
  const [employees, setEmployees] = useState(() => generateRealisticEmployees());

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeRole, setActiveRole] = useState<'owner' | 'employee'>('owner');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Flow states
  const [showAudit, setShowAudit] = useState(true);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
    leadCaptureScore: 45,
    responseAutomationScore: 20,
    customerExperienceScore: 70,
    issues: [
      { id: '1', title: 'Chybějící interaktivní lead formulář', description: 'Web nemá rychlý poptávkový formulář pro okamžitý sběr poptávek.', severity: 'error' },
      { id: '2', title: 'Žádné automatické potvrzení klientům', description: 'Zákazníci čekají dny na odpověď bez automatické potvrzovací SMS či e-mailu.', severity: 'warning' },
      { id: '3', title: 'Chybí klientská fotogalerie před/po', description: 'Na webu chybí moderní vizuální ukázky realizovaných projektů.', severity: 'warning' }
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
    setIsDemoModalOpen(false);
    setShowAudit(true);
  };

  const handleUpdateLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
  };

  const handleUpdateLead = (updated: Lead) => {
    setLeads(leads.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
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

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
      {/* 280px Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedLead(null);
        }}
        branding={branding}
        onOpenDemoGenerator={() => setIsDemoModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-72 flex flex-col min-h-screen">
        <Header
          branding={branding}
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          onOpenDemoGenerator={() => setIsDemoModalOpen(true)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {activeRole === 'employee' ? (
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
                    setNotifications(prev => [
                      {
                        id: 'notif-' + Date.now(),
                        title: `Nová poptávka: ${newInquiry.fullName}`,
                        message: `${newInquiry.projectType} (${(priceValue / 1000).toFixed(0)}k CZK) • Přiřazen Petr Novotný`,
                        time: 'Právě teď',
                        read: false,
                        type: 'lead'
                      },
                      ...prev
                    ]);
                  }}
                  onBackToDashboard={() => setCurrentTab('dashboard')}
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
                <div className="space-y-6 max-w-2xl">
                  <h2 className="text-2xl font-bold text-slate-900">Branding & System Settings</h2>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Company Name</label>
                      <input type="text" readOnly value={branding.name} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Primary Branding Color</label>
                      <div className="flex items-center gap-3 mt-1">
                        <input type="color" value={branding.primaryColor} disabled className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer" />
                        <span className="font-mono text-xs">{branding.primaryColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700">Services</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {branding.services.map((s: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">{s}</span>
                        ))}
                      </div>
                    </div>
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
      />
    </div>
  );
}
