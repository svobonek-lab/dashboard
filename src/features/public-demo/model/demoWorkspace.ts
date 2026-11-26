import type { Lead, LeadStatus } from '../../../entities/lead';
import type { Employee } from '../../../entities/employee';
import { PUBLIC_DEMO_LEADS, PUBLIC_DEMO_LEAD_STATES } from './demoData';

/**
 * In-memory model of the public demo workspace.
 *
 * Everything here is pure: it takes the current list and returns a new one. Nothing touches
 * storage, the network or any backend client, so a visitor can move and edit synthetic jobs
 * without any change ever leaving the page.
 */

export const DEMO_AUTHOR = 'Demo majitel';

export const DEMO_LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  New: 'Nová poptávka',
  Contacted: 'Kontaktováno',
  Quote: 'Rozpočet / Nabídka',
  'In Progress': 'Realizace stavby',
  Completed: 'Dokončeno & Předáno',
  Lost: 'Stornováno',
};

interface DemoLeadDetails {
  phone: string;
  email: string;
  address: string;
  description: string;
  priority: Lead['priority'];
  employeeId: string;
  preferredDate: string;
  history: { timestamp: string; action: string; author: string }[];
}

// Synthetic contact data only: reserved .test domains and obviously fictional numbers.
const DEMO_LEAD_DETAILS: Record<string, DemoLeadDetails> = {
  'demo-101': {
    phone: '+420 777 000 101',
    email: 'novotni@example.test',
    address: 'Žabovřeská 18, Brno-Žabovřesky',
    description: 'Kompletní rekonstrukce koupelny v rodinném domě: bourání, nové rozvody vody a elektřiny, obklady a sanita.',
    priority: 'High',
    employeeId: '',
    preferredDate: '2026-12-08',
    history: [
      { timestamp: '26. 11. 2026 9:20', action: 'Poptávka přijata z webového formuláře', author: 'Systém' },
    ],
  },
  'demo-102': {
    phone: '+420 777 000 102',
    email: 'sprava@javor.example.test',
    address: 'Cejl 41, Brno-střed',
    description: 'Oprava společné střechy bytového domu po zimě: výměna poškozených tašek a klempířských prvků.',
    priority: 'Medium',
    employeeId: 'emp-1',
    preferredDate: '2027-03-15',
    history: [
      { timestamp: '26. 11. 2026 8:45', action: 'Zákazník kontaktován telefonem', author: 'Petr Novotný' },
      { timestamp: '25. 11. 2026 16:10', action: 'Poptávka přijata z webového formuláře', author: 'Systém' },
    ],
  },
  'demo-105': {
    phone: '+420 777 000 105',
    email: 'malych@example.test',
    address: 'Tyršova 7, Modřice',
    description: 'Nová kuchyně včetně úpravy rozvodů. Zaměření domluveno na zítra v 10:30.',
    priority: 'Medium',
    employeeId: 'emp-2',
    preferredDate: '2026-11-27',
    history: [
      { timestamp: '25. 11. 2026 14:00', action: 'Domluveno zaměření na místě', author: 'Martin Kovář' },
      { timestamp: '24. 11. 2026 10:30', action: 'Poptávka přijata z webového formuláře', author: 'Systém' },
    ],
  },
  'demo-103': {
    phone: '+420 777 000 103',
    email: 'atelier@example.test',
    address: 'Lipová 5, Kuřim',
    description: 'Nová terasa s hliníkovou pergolou. Cenová nabídka byla odeslána a čeká na odpověď zákazníka.',
    priority: 'Medium',
    employeeId: 'emp-2',
    preferredDate: '2027-04-20',
    history: [
      { timestamp: '25. 11. 2026 11:15', action: 'Cenová nabídka odeslána zákazníkovi', author: 'Martin Kovář' },
      { timestamp: '20. 11. 2026 9:00', action: 'Poptávka přijata z webového formuláře', author: 'Systém' },
    ],
  },
  'demo-104': {
    phone: '+420 777 000 104',
    email: 'upotoka@example.test',
    address: 'Na Potoce 12, Tišnov',
    description: 'Zateplení fasády chalupy. Zakázka je potvrzená a stavba probíhá.',
    priority: 'Low',
    employeeId: 'emp-3',
    preferredDate: '2026-11-30',
    history: [
      { timestamp: '25. 11. 2026 8:00', action: 'Zahájena realizace stavby', author: 'Tomáš Veselý' },
      { timestamp: '18. 11. 2026 13:20', action: 'Nabídka přijata zákazníkem', author: 'Systém' },
    ],
  },
};

function formatStamp(now: Date): string {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }).format(now);
}

function historyEntry(leadId: string, action: string, now: Date) {
  return { id: `${leadId}-h${now.getTime()}`, timestamp: formatStamp(now), action, author: DEMO_AUTHOR };
}

/** Builds the full job records the real kanban and detail screens expect from the demo fixture. */
export function createPublicDemoLeads(organizationId: string, employees: readonly Employee[]): Lead[] {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  return PUBLIC_DEMO_LEADS.map((seed) => {
    const details = DEMO_LEAD_DETAILS[seed.id];
    const employee = details ? byId.get(details.employeeId) : undefined;
    return {
      organization_id: organizationId,
      id: seed.id,
      title: seed.project,
      description: details?.description ?? '',
      city: seed.city,
      address: details?.address ?? seed.city,
      customerName: seed.customer,
      customerPhone: details?.phone ?? '',
      customerEmail: details?.email ?? '',
      preferredDate: details?.preferredDate ?? '',
      price: seed.value,
      status: PUBLIC_DEMO_LEAD_STATES[seed.status].status,
      priority: details?.priority ?? 'Medium',
      assignedEmployeeId: employee?.id ?? '',
      assignedEmployeeName: employee?.name ?? '',
      thumbnail: '',
      photos: [],
      files: [],
      checklist: [],
      timeline: [],
      aiChat: [],
      aiSummary: {
        jobType: seed.project,
        complexity: 'Medium',
        estimatedRange: '',
        assignedEmployee: employee?.name ?? '',
        risks: [],
        recommendedNextStep: '',
      },
      history: (details?.history ?? []).map((event, index) => ({ id: `${seed.id}-seed-${index}`, ...event })),
    } satisfies Lead;
  });
}

/** Moves one job to another stage and records the change; returns the same list when nothing changes. */
export function moveDemoLeadStatus(leads: Lead[], leadId: string, status: LeadStatus, now: Date = new Date()): Lead[] {
  const current = leads.find((lead) => lead.id === leadId);
  if (!current || current.status === status) return leads;
  const action = `Stav změněn: ${DEMO_LEAD_STATUS_LABELS[current.status]} → ${DEMO_LEAD_STATUS_LABELS[status]}`;
  return leads.map((lead) => (lead.id === leadId
    ? { ...lead, status, history: [historyEntry(lead.id, action, now), ...(lead.history ?? [])] }
    : lead));
}

/** Applies a partial edit (for example an assignment) and records a changed assignment. */
export function patchDemoLead(leads: Lead[], patch: Partial<Lead> & Pick<Lead, 'id'>, now: Date = new Date()): Lead[] {
  return leads.map((lead) => {
    if (lead.id !== patch.id) return lead;
    const next: Lead = { ...lead, ...patch };
    const assignmentChanged = patch.assignedEmployeeId !== undefined && patch.assignedEmployeeId !== lead.assignedEmployeeId;
    if (!assignmentChanged) return next;
    const action = next.assignedEmployeeName ? `Zakázka přiřazena: ${next.assignedEmployeeName}` : 'Přiřazení zakázky odebráno';
    return { ...next, history: [historyEntry(lead.id, action, now), ...(lead.history ?? [])] };
  });
}

/** Turns the form draft from the real "new job" dialog into a demo record with a local id. */
export function createDemoLeadFromDraft(draft: Lead, organizationId: string, now: Date = new Date()): Lead {
  const id = `demo-${now.getTime()}`;
  return {
    ...draft,
    id,
    organization_id: organizationId,
    status: 'New',
    history: [historyEntry(id, 'Poptávka vytvořena v demu', now)],
  };
}

/** A note on a demo job. Kept in memory only, like every other demo change. */
export interface DemoNote {
  id: string;
  leadId: string;
  body: string;
  author: string;
  createdAt: string;
}

export const DEMO_NOTE_MAX_LENGTH = 1000;

/** A few starting notes so the notes section never looks empty on the first open. */
export function createInitialDemoNotes(): DemoNote[] {
  return [
    {
      id: 'demo-note-1',
      leadId: 'demo-102',
      body: 'Zákazník potvrdil, že přístup na střechu je ze dvora. Klíče od půdy předá správce domu.',
      author: 'Petr Novotný',
      createdAt: '2026-11-26T08:50:00',
    },
    {
      id: 'demo-note-2',
      leadId: 'demo-104',
      body: 'Dodavatel polystyrenu slíbil dodávku do pátku. Lešení stojí, můžeme začít od severní strany.',
      author: 'Tomáš Veselý',
      createdAt: '2026-11-25T08:15:00',
    },
  ];
}

/** Adds a trimmed note at the top of the list; an empty note changes nothing. */
export function addDemoNote(notes: DemoNote[], leadId: string, body: string, now: Date = new Date()): DemoNote[] {
  const text = body.trim().slice(0, DEMO_NOTE_MAX_LENGTH);
  if (!text) return notes;
  const note: DemoNote = { id: `demo-note-${now.getTime()}`, leadId, body: text, author: DEMO_AUTHOR, createdAt: now.toISOString() };
  return [note, ...notes];
}

export function removeDemoNote(notes: DemoNote[], noteId: string): DemoNote[] {
  return notes.some((note) => note.id === noteId) ? notes.filter((note) => note.id !== noteId) : notes;
}

export function getDemoLeadNotes(notes: readonly DemoNote[], leadId: string): DemoNote[] {
  return notes.filter((note) => note.leadId === leadId);
}
