import type { ConnectorSourceColumn } from '../api/connectorContract.js';

export interface CanonicalFieldSuggestion {
  entityType: 'company' | 'lead';
  targetField: 'name' | 'email' | 'status' | 'title' | 'customer' | 'phone' | 'assignedToEmail';
  conversion: { kind: 'text' | 'email' };
}

const FIELD_ALIASES: Record<string, CanonicalFieldSuggestion> = {
  firma: { entityType: 'company', targetField: 'name', conversion: { kind: 'text' } },
  firma_nazev: { entityType: 'company', targetField: 'name', conversion: { kind: 'text' } },
  company_name: { entityType: 'company', targetField: 'name', conversion: { kind: 'text' } },
  kontakt_email: { entityType: 'lead', targetField: 'email', conversion: { kind: 'email' } },
  assigned_email: { entityType: 'lead', targetField: 'assignedToEmail', conversion: { kind: 'email' } },
  assigned_to_email: { entityType: 'lead', targetField: 'assignedToEmail', conversion: { kind: 'email' } },
  email: { entityType: 'lead', targetField: 'email', conversion: { kind: 'email' } },
  zakazka_stav: { entityType: 'lead', targetField: 'status', conversion: { kind: 'text' } },
  lead_status: { entityType: 'lead', targetField: 'status', conversion: { kind: 'text' } },
  stav: { entityType: 'lead', targetField: 'status', conversion: { kind: 'text' } },
  nazev_zakazky: { entityType: 'lead', targetField: 'title', conversion: { kind: 'text' } },
  zakaznik: { entityType: 'lead', targetField: 'customer', conversion: { kind: 'text' } },
  customer_name: { entityType: 'lead', targetField: 'customer', conversion: { kind: 'text' } },
  jmeno_zakaznika: { entityType: 'lead', targetField: 'customer', conversion: { kind: 'text' } },
  telefon: { entityType: 'lead', targetField: 'phone', conversion: { kind: 'text' } },
  phone: { entityType: 'lead', targetField: 'phone', conversion: { kind: 'text' } },
  title: { entityType: 'lead', targetField: 'title', conversion: { kind: 'text' } },
};

const SECRET_LIKE = /password|secret|token|private[_-]?key|api[_-]?key/i;
const TEXT_TYPES = /char|text|string|clob|nchar|ntext/i;

function normalizeFieldName(value: string): string {
  return value.trim().toLocaleLowerCase('en').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[\s.-]+/g, '_');
}

/** Suggest a canonical destination using inspected column metadata only. */
export function suggestCanonicalField(source: ConnectorSourceColumn): CanonicalFieldSuggestion | undefined {
  if (SECRET_LIKE.test(source.name) || !TEXT_TYPES.test(source.dataType)) return undefined;
  return FIELD_ALIASES[normalizeFieldName(source.name)];
}
