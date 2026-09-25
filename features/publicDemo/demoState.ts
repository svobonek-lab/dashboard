export type DemoStatus = 'new' | 'contacted' | 'scheduled' | 'quote' | 'job';
export type DemoJourneyStep = 0 | 1 | 2 | 3;
export const DEMO_JOURNEY_STEPS = ['Poptávka', 'Nabídka', 'Terénní náklady', 'Výsledek'] as const;

export function nextDemoJourneyStep(step: DemoJourneyStep): DemoJourneyStep | null {
  return step < DEMO_JOURNEY_STEPS.length - 1 ? (step + 1) as DemoJourneyStep : null;
}

export function calculateDemoMargin(revenue: number, costs: number): number | null {
  if (!Number.isFinite(revenue) || !Number.isFinite(costs) || revenue <= 0 || costs < 0) return null;
  return Math.round(((revenue - costs) / revenue) * 1000) / 10;
}

export type DemoLead = {
  id: string;
  customer: string;
  project: string;
  city: string;
  value: number;
  status: DemoStatus;
  updated: string;
  email?: string;
  phone?: string;
};

export const DEMO_SEED: DemoLead[] = [
  { id: 'demo-101', customer: 'Rodinný dům Novotných', project: 'Rekonstrukce koupelny', city: 'Brno-Žabovřesky', value: 185000, status: 'new', updated: 'Dnes, 9:20' },
  { id: 'demo-102', customer: 'Bytový dům Javor', project: 'Oprava společné střechy', city: 'Brno-střed', value: 640000, status: 'contacted', updated: 'Dnes, 8:45' },
  { id: 'demo-105', customer: 'Rodina Malých', project: 'Rekonstrukce kuchyně', city: 'Modřice', value: 315000, status: 'scheduled', updated: 'Zaměření · zítra 10:30' },
  { id: 'demo-103', customer: 'Ateliér Na Výsluní', project: 'Nová terasa a pergola', city: 'Kuřim', value: 278000, status: 'quote', updated: 'Včera' },
  { id: 'demo-104', customer: 'Chalupa U Potoka', project: 'Zateplení fasády', city: 'Tišnov', value: 420000, status: 'job', updated: 'Včera' },
];

export const DEMO_COLUMNS: { id: DemoStatus; label: string }[] = [
  { id: 'new', label: 'Nové poptávky' },
  { id: 'contacted', label: 'K zavolání' },
  { id: 'scheduled', label: 'Domluvené zaměření' },
  { id: 'quote', label: 'Cenová nabídka' },
  { id: 'job', label: 'Zakázky' },
];

const STATUS_ORDER: DemoStatus[] = ['new', 'contacted', 'scheduled', 'quote', 'job'];

export function nextDemoStatus(status: DemoStatus): DemoStatus | null {
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(status) + 1];
  return next ?? null;
}

export function parseDemoLeads(serialized: string | null): DemoLead[] {
  if (!serialized) return DEMO_SEED.map((lead) => ({ ...lead }));
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value) || value.length === 0 || !value.every(isDemoLead)) {
      return DEMO_SEED.map((lead) => ({ ...lead }));
    }
    return value;
  } catch {
    return DEMO_SEED.map((lead) => ({ ...lead }));
  }
}

function isDemoLead(value: unknown): value is DemoLead {
  if (!value || typeof value !== 'object') return false;
  const lead = value as Partial<DemoLead>;
  return typeof lead.id === 'string' && lead.id.startsWith('demo-')
    && typeof lead.customer === 'string' && typeof lead.project === 'string'
    && typeof lead.city === 'string' && typeof lead.value === 'number'
    && ['new', 'contacted', 'scheduled', 'quote', 'job'].includes(lead.status ?? '');
}

export function createDemoLead(input: { customer: string; project: string; city: string }, now = Date.now()): DemoLead {
  return {
    id: `demo-${now}`,
    customer: input.customer.trim(),
    project: input.project.trim(),
    city: input.city.trim(),
    value: 0,
    status: 'new',
    updated: 'Právě přidáno',
  };
}

export function moveDemoLead(lead: DemoLead, status: DemoStatus): DemoLead {
  return { ...lead, status, updated: 'Právě změněno' };
}
