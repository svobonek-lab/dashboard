import type { Lead, LeadStatus } from '@/entities/lead';

export interface SalesStage {
  id: LeadStatus;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
}

export const SALES_STAGES: SalesStage[] = [
  { id: 'New', label: 'Nové poptávky', shortLabel: 'Nové', description: 'Čekají na první kontakt', accent: '#0A84FF' },
  { id: 'Contacted', label: 'Kontaktováno', shortLabel: 'Kontakt', description: 'Probíhá kvalifikace', accent: '#FF9F0A' },
  { id: 'Quote', label: 'Nabídka', shortLabel: 'Nabídka', description: 'Čekají na rozhodnutí', accent: '#5856D6' },
  { id: 'In Progress', label: 'Realizace', shortLabel: 'Realizace', description: 'Probíhá stavba', accent: '#34C759' },
  { id: 'Completed', label: 'Dokončeno', shortLabel: 'Hotovo', description: 'Předáno zákazníkovi', accent: '#AF52DE' },
];

export interface SalesWorkspaceSummary {
  total: number;
  pipelineValue: number;
  openValue: number;
  wonValue: number;
  conversionRate: number;
  unassignedCount: number;
  stageCounts: Record<LeadStatus, number>;
}

export function summarizeSalesWorkspace(leads: Lead[]): SalesWorkspaceSummary {
  const stageCounts = SALES_STAGES.reduce((result, stage) => {
    result[stage.id] = leads.filter((lead) => lead.status === stage.id).length;
    return result;
  }, {} as Record<LeadStatus, number>);
  const pipelineValue = leads.filter((lead) => lead.status !== 'Lost').reduce((sum, lead) => sum + (lead.price || 0), 0);
  const won = leads.filter((lead) => lead.status === 'Completed');
  const completedAndLost = leads.filter((lead) => lead.status === 'Completed' || lead.status === 'Lost').length;
  return {
    total: leads.length,
    pipelineValue,
    openValue: leads.filter((lead) => !['Completed', 'Lost'].includes(lead.status)).reduce((sum, lead) => sum + (lead.price || 0), 0),
    wonValue: won.reduce((sum, lead) => sum + (lead.price || 0), 0),
    conversionRate: completedAndLost ? Math.round((won.length / completedAndLost) * 100) : 0,
    unassignedCount: leads.filter((lead) => !lead.assignedEmployeeId).length,
    stageCounts,
  };
}

export function getNextSalesAction(lead: Lead): string {
  switch (lead.status) {
    case 'New': return 'Zavolat zákazníkovi';
    case 'Contacted': return 'Naplánovat zaměření';
    case 'Quote': return 'Provést follow-up nabídky';
    case 'In Progress': return 'Zkontrolovat deník stavby';
    case 'Completed': return 'Vyžádat hodnocení';
    default: return 'Zkontrolovat detail';
  }
}

export function sortSalesLeads(leads: Lead[], query = ''): Lead[] {
  const normalized = query.trim().toLowerCase();
  return [...leads]
    .filter((lead) => !normalized || [lead.title, lead.customerName, lead.city, lead.address].some((value) => value?.toLowerCase().includes(normalized)))
    .sort((a, b) => {
      const priority = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      return (priority[b.priority] || 0) - (priority[a.priority] || 0) || (b.price || 0) - (a.price || 0);
    });
}
