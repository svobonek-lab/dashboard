type ExportLead = {
  id: string;
  title?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  status?: string;
  priority?: string;
  preferredDate?: string;
  price?: number | string;
  source?: string;
  createdDate?: string;
  assignedEmployeeName?: string;
};

type ExportEmployee = {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  capacity?: number | string;
  active?: boolean;
  invitationStatus?: string;
};

type ExportEvent = {
  lead_id: string;
  operation: string;
  old_status?: string | null;
  new_status?: string | null;
  created_at: string;
};

const HEADERS = [
  'Typ', 'Poptávka', 'Zákazník', 'E-mail', 'Telefon', 'Popis', 'Stav', 'Priorita',
  'Termín', 'Cena', 'Zdroj', 'Vytvořeno', 'Zaměstnanec', 'Specializace', 'Kapacita',
  'Aktivní', 'Událost', 'Předchozí stav', 'Nový stav', 'Datum události',
];

function escapeCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function eventLabel(event: ExportEvent): string {
  if (event.operation === 'INSERT') return 'Poptávka vytvořena';
  if (event.old_status && event.new_status && event.old_status !== event.new_status) return 'Změna stavu';
  if (event.operation === 'NOTE_ADDED') return 'Poznámka přidána';
  if (event.operation === 'FILE_ADDED') return 'Soubor přidán';
  return 'Zakázka upravena';
}

export function buildCompanyExportCsv(input: {
  leads: ExportLead[];
  employees: ExportEmployee[];
  events: ExportEvent[];
}): string {
  const leadById = new Map(input.leads.map((lead) => [lead.id, lead]));
  const rows = [HEADERS.map(escapeCell).join(';')];
  const append = (values: Record<string, unknown>) => {
    rows.push(HEADERS.map((header) => escapeCell(values[header])).join(';'));
  };

  for (const lead of input.leads) {
    append({
      Typ: 'Poptávka', Poptávka: lead.title, Zákazník: lead.customerName, 'E-mail': lead.customerEmail,
      Telefon: lead.customerPhone, Popis: lead.description, Stav: lead.status, Priorita: lead.priority,
      Termín: lead.preferredDate, Cena: lead.price, Zdroj: lead.source, Vytvořeno: lead.createdDate,
      Zaměstnanec: lead.assignedEmployeeName,
    });
  }

  for (const employee of input.employees) {
    append({
      Typ: 'Zaměstnanec', Poptávka: employee.name, 'E-mail': employee.email, Telefon: employee.phone,
      Specializace: employee.specialization, Kapacita: employee.capacity,
      Aktivní: employee.active === undefined ? '' : employee.active ? 'Ano' : 'Ne',
    });
  }

  for (const event of input.events) {
    const lead = leadById.get(event.lead_id);
    if (!lead) continue;
    append({
      Typ: 'Historie', Poptávka: lead.title, Událost: eventLabel(event),
      'Předchozí stav': event.old_status, 'Nový stav': event.new_status, 'Datum události': event.created_at,
    });
  }

  return `\uFEFF${rows.join('\r\n')}`;
}
