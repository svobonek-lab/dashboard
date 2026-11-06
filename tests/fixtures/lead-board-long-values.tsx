import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Lead } from '../../src/entities/lead';
import { LeadsKanban } from '../../src/features/manage-leads/ui/LeadsKanban';
import '../../src/app/styles/index.css';

const leads = [{
  id: 'synthetic-long-lead',
  title: 'Oprava a kompletní rekonstrukce střechy rodinného domu včetně zateplení, okapů a nového krovu',
  description: 'Pouze lokální syntetická data pro vizuální kontrolu.',
  city: 'Brno', address: 'Syntetická ulice 1, Brno', customerName: 'Syntetický zákazník',
  customerPhone: '+420700000001', customerEmail: 'customer@example.test', preferredDate: 'Později',
  price: 987654321, status: 'New', priority: 'Medium', assignedEmployeeId: 'synthetic-employee',
  assignedEmployeeName: 'Testovací zaměstnanec', thumbnail: '', photos: [], files: [], checklist: [],
  aiSummary: {} as Lead['aiSummary'], timeline: [], aiChat: [], history: [],
}] as Lead[];

createRoot(document.getElementById('lead-board-test-root')!).render(
  <LeadsKanban leads={leads} onSelectLead={() => undefined} onUpdateLeadStatus={() => undefined} readOnly />,
);
