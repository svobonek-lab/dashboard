import type { Lead } from '@/entities/lead';

export type DashboardLead = Pick<Lead,
  'id' | 'title' | 'customerName' | 'price' | 'status' | 'priority' | 'assignedEmployeeName' | 'calculatedMargin'
>;

export interface OwnerAttentionItem {
  id: string;
  leadId: string;
  type: 'critical' | 'warning' | 'urgent';
  tag: string;
  client: string;
  amount: string;
  deadline: string;
  actionText: string;
}

const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

export function getOwnerAttentionItems(leads: DashboardLead[]): OwnerAttentionItem[] {
  return leads
    .filter((lead) => lead.status === 'New' || lead.status === 'Quote')
    .map((lead) => {
      const isNew = lead.status === 'New';
      const urgent = lead.priority === 'Urgent' || lead.priority === 'High';
      return {
        id: lead.id,
        leadId: lead.id,
        type: isNew ? (urgent ? 'critical' : 'urgent') : 'warning',
        tag: isNew ? 'Nová poptávka' : 'Čeká na odpověď',
        client: `${lead.customerName} · ${lead.title}`,
        amount: lead.price > 0 ? currency.format(lead.price) : 'Cena není uvedena',
        deadline: isNew ? 'Ozvat se zákazníkovi' : 'Navázat na nabídku',
        actionText: 'Otevřít poptávku',
      };
    });
}

export function getOwnerActiveJobs(leads: DashboardLead[]): DashboardLead[] {
  return leads.filter((lead) => lead.status === 'In Progress');
}

export function getOwnerAverageMargin(leads: Array<Pick<Lead, 'calculatedMargin'>>): number | null {
  const margins = leads
    .map((lead) => lead.calculatedMargin)
    .filter((margin): margin is number => typeof margin === 'number' && Number.isFinite(margin));
  if (!margins.length) return null;
  return Math.round((margins.reduce((sum, margin) => sum + margin, 0) / margins.length) * 10) / 10;
}
