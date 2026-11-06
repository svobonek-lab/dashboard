import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Lead } from '../../src/entities/lead';
import type { CompanyBranding } from '../../src/entities/company';
import { EmployeeDashboard } from '../../src/features/employee-workflow/ui/EmployeeDashboard';
import '../../src/app/styles/index.css';

const leads = [
  {
    id: 'synthetic-active-job',
    title: 'Oprava střechy v ulici Na Výsluní',
    description: 'Syntetický vizuální scénář.',
    city: 'Brno',
    address: 'Na Výsluní 42, Brno',
    customerName: 'Testovací zákazník',
    customerPhone: '+420 700 000 001',
    customerEmail: 'customer@example.test',
    preferredDate: 'Zítra',
    price: 125000,
    status: 'In Progress',
    priority: 'High',
    assignedEmployeeId: 'synthetic-employee',
    assignedEmployeeName: 'Testovací zaměstnanec',
    thumbnail: '',
    photos: [], files: [], checklist: [], aiSummary: {} as Lead['aiSummary'], timeline: [], aiChat: [], history: [],
  },
  {
    id: 'synthetic-completed-job',
    title: 'Dokončená výměna okapů',
    description: 'Syntetický vizuální scénář.',
    city: 'Brno',
    address: 'U Nádraží 4, Brno',
    customerName: 'Další testovací zákazník',
    customerPhone: '', customerEmail: 'customer2@example.test', preferredDate: '', price: 42000,
    status: 'Completed', priority: 'Medium', assignedEmployeeId: 'synthetic-employee', assignedEmployeeName: 'Testovací zaměstnanec',
    thumbnail: '', photos: [], files: [], checklist: [], aiSummary: {} as Lead['aiSummary'], timeline: [], aiChat: [], history: [],
  },
] as Lead[];

const branding = { name: 'Syntetická firma', primaryColor: '#2563eb', phone: '', email: '', city: '', address: '', services: [] } as CompanyBranding;

createRoot(document.getElementById('employee-test-root')!).render(
  <EmployeeDashboard leads={leads} branding={branding} onOpenVoiceNotes={() => undefined} onSelectLead={() => undefined} />,
);
