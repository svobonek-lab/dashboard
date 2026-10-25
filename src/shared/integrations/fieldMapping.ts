import type { FieldMappingConfig, FieldMappingRule, TargetFieldType } from '../model/integrations.js';
import type { MappedLeadStatus as LeadStatus, MappedPriority as Priority } from '../model/integrationMapping.js';

// Normalized dictionary for construction CRM fields
// Prioritizes PATCH P8 mappings: customer_name -> Customer, project_title -> Project, worker -> Employee, status -> Status
const FIELD_DICTIONARY: Record<TargetFieldType, string[]> = {
  customerName: [
    'customer_name', 'customer', 'customername', 'zakaznik', 'jmeno', 'klient', 
    'objednatel', 'cele_jmeno', 'full_name', 'fullname', 'kontaktni_osoba', 'odberatel', 'name'
  ],
  title: [
    'project_title', 'project', 'projecttitle', 'title', 'nazev', 'projekt', 'stavba', 
    'predmet', 'typ_stavby', 'nazev_projektu', 'zakazka', 'diloo'
  ],
  price: [
    'budget', 'price', 'cena', 'castka', 'hodnota', 'naklady', 'rozpocet', 
    'predpokladana_cena', 'castka_s_dph', 'castka_bez_dph', 'total', 'amount', 'cost'
  ],
  assignedEmployeeName: [
    'worker', 'employee', 'worker_name', 'technik', 'montaznik', 'odpovedna_osoba', 'stavbyvedouci', 
    'mistr', 'prirazeno', 'zodpovedny', 'pracovnik', 'vedouci_party', 'assigned_to', 'assigned_employee'
  ],
  status: [
    'status', 'stav', 'faze', 'etapa', 'stav_zakazky', 'state', 'stage', 'workflow_state'
  ],
  customerPhone: [
    'phone', 'telefon', 'tel', 'mobil', 'kontakt_telefon', 'telefonni_cislo', 'customer_phone', 'mobile'
  ],
  customerEmail: [
    'email', 'mail', 'e-mail', 'kontakt_email', 'customer_email', 'elektronicka_posta'
  ],
  city: [
    'city', 'mesto', 'obec', 'lokalita', 'okres', 'misto_realizace', 'obec_stavby', 'town'
  ],
  address: [
    'address', 'adresa', 'ulice', 'misto_stavby', 'lokace', 'street', 'location'
  ],
  preferredDate: [
    'preferred_date', 'date', 'termin', 'datum', 'zahajeni', 'termin_realizace', 
    'pozadovany_termin', 'deadline', 'start_date', 'planovany_termin'
  ],
  description: [
    'description', 'popis', 'poznamka', 'specifikace', 'detail', 'poznamky', 'notes', 'zadani', 'scope'
  ],
  priority: [
    'priority', 'priorita', 'dulezitost', 'specha', 'urgency'
  ],
  ignore: ['id', 'created_at', 'updated_at', 'internal_hash', 'deleted', '_id']
};

/**
 * Clean & normalize string for matching
 */
function cleanKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Automatically suggests the best TargetFieldType for a given column name and sample value
 */
export function suggestFieldMapping(columnName: string, sampleValue?: any): { targetField: TargetFieldType; confidence: number } {
  const clean = cleanKey(columnName);

  // 1. Direct exact dictionary match (100% confidence)
  for (const [targetField, variants] of Object.entries(FIELD_DICTIONARY) as [TargetFieldType, string[]][]) {
    for (const variant of variants) {
      if (clean === variant) {
        return { targetField, confidence: 100 };
      }
    }
  }

  // 1b. Fuzzy / substring dictionary match (85% confidence)
  for (const [targetField, variants] of Object.entries(FIELD_DICTIONARY) as [TargetFieldType, string[]][]) {
    for (const variant of variants) {
      if (clean.includes(variant) || variant.includes(clean)) {
        return { targetField, confidence: 85 };
      }
    }
  }

  // 2. Value-based heuristic inspection if sample value is provided
  if (sampleValue !== undefined && sampleValue !== null) {
    const valStr = String(sampleValue).trim();

    // Check for Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) {
      return { targetField: 'customerEmail', confidence: 95 };
    }

    // Check for Phone (+420, 9-digits)
    if (/^(\+420|\+421)?\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{3}$/.test(valStr.replace(/\s+/g, ''))) {
      return { targetField: 'customerPhone', confidence: 92 };
    }

    // Check for Price / Currency (e.g. 250000, 150 000 Kč, 45000.00)
    if (/^[0-9\s.,]+(\s?(kč|czk|eur|€))?$/i.test(valStr) && valStr.length >= 4 && !valStr.startsWith('+')) {
      const num = parseFloat(valStr.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(num) && num > 1000) {
        return { targetField: 'price', confidence: 75 };
      }
    }

    // Check for ISO or Czech Date
    if (/^\d{4}-\d{2}-\d{2}/.test(valStr) || /^\d{1,2}\.\d{1,2}\.\d{4}/.test(valStr)) {
      return { targetField: 'preferredDate', confidence: 88 };
    }
  }

  return { targetField: 'ignore', confidence: 20 };
}

/**
 * Builds smart mapping rules for all headers with sample row
 */
export function generateSmartMappings(headers: string[], sampleRow?: Record<string, any>): FieldMappingRule[] {
  return headers.map(header => {
    const sampleVal = sampleRow ? sampleRow[header] : undefined;
    const { targetField, confidence } = suggestFieldMapping(header, sampleVal);

    return {
      sourceColumn: header,
      targetField,
      confidence,
      sampleValue: sampleVal !== undefined ? String(sampleVal) : '',
      isAutoDetected: confidence >= 70
    };
  });
}

/**
 * Normalizes incoming status text to CRM LeadStatus
 */
export function normalizeLeadStatus(rawStatus: any): LeadStatus {
  if (!rawStatus) return 'New';
  const clean = cleanKey(String(rawStatus));

  if (['nova', 'novy', 'new', 'poptavka', 'prijato', 'zadost', 'lead'].some(k => clean.includes(k))) {
    return 'New';
  }
  if (['kontaktovano', 'kontakt', 'contacted', 'v_jednani', 'domluva', 'volano', 'schuzka'].some(k => clean.includes(k))) {
    return 'Contacted';
  }
  if (['nabidka', 'quote', 'kalkulace', 'rozpocet', 'cenova_nabidka', 'nabidnuto'].some(k => clean.includes(k))) {
    return 'Quote';
  }
  if (['realizace', 'in_progress', 'montaz', 've_vyrobe', 'vyroba', 'probihajici', 'aktivni', 'stavba'].some(k => clean.includes(k))) {
    return 'In Progress';
  }
  if (['hotovo', 'dokonceno', 'completed', 'predano', 'vyfakturovano', 'zaplaceno', 'uspesne'].some(k => clean.includes(k))) {
    return 'Completed';
  }
  if (['lost', 'ztraceno', 'zruseno', 'odmitnuto', 'storno', 'propadlo'].some(k => clean.includes(k))) {
    return 'Lost';
  }

  return 'New';
}

/**
 * Normalizes price string/number
 */
export function normalizePrice(rawPrice: any): number {
  if (typeof rawPrice === 'number') return isNaN(rawPrice) ? 0 : rawPrice;
  if (!rawPrice) return 0;
  const str = String(rawPrice).replace(/[^\d.,]/g, '').replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Normalizes Czech phone number to standard international format
 */
export function normalizePhone(rawPhone: any): string {
  if (!rawPhone) return '';
  const cleaned = String(rawPhone).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 9) return `+420 ${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`;
  return cleaned;
}

/**
 * Normalizes priority
 */
export function normalizePriority(rawPriority: any): Priority {
  if (!rawPriority) return 'Medium';
  const clean = cleanKey(String(rawPriority));
  if (clean.includes('urgent') || clean.includes('kritick') || clean.includes('specha')) return 'Urgent';
  if (clean.includes('high') || clean.includes('vysok')) return 'High';
  if (clean.includes('low') || clean.includes('nizk')) return 'Low';
  return 'Medium';
}

/**
 * Maps a single raw database / NAS record row to normalized lead fields using FieldMappingConfig
 */
export function mapSourceRowToLeadFields(
  row: Record<string, any>,
  fieldMapping: FieldMappingConfig
) {
  let customerName = 'Importovaný zákazník';
  let title = 'Zakázka z NAS';
  let price = 150000;
  let assignedEmployeeName = 'Dispečink';
  let status: LeadStatus = 'New';
  let customerPhone = '';
  let customerEmail = '';
  let city = 'ČR';
  let address = 'ČR';
  let preferredDate = new Date().toISOString().substring(0, 10);
  let description = 'Importováno ze Synology NAS';
  let priority: Priority = 'Medium';

  for (const [colName, targetField] of Object.entries(fieldMapping)) {
    const val = row[colName];
    if (val === undefined || val === null || targetField === 'ignore') continue;

    switch (targetField) {
      case 'customerName':
        customerName = String(val).trim() || customerName;
        break;
      case 'title':
        title = String(val).trim() || title;
        break;
      case 'price':
        price = normalizePrice(val);
        break;
      case 'assignedEmployeeName':
        assignedEmployeeName = String(val).trim() || assignedEmployeeName;
        break;
      case 'status':
        status = normalizeLeadStatus(val);
        break;
      case 'customerPhone':
        customerPhone = normalizePhone(val);
        break;
      case 'customerEmail':
        customerEmail = String(val).trim();
        break;
      case 'city':
        city = String(val).trim() || city;
        break;
      case 'address':
        address = String(val).trim() || address;
        break;
      case 'preferredDate':
        preferredDate = String(val).trim() || preferredDate;
        break;
      case 'description':
        description = String(val).trim() || description;
        break;
      case 'priority':
        priority = normalizePriority(val);
        break;
    }
  }

  return {
    customerName,
    title,
    price,
    assignedEmployeeName,
    status,
    customerPhone,
    customerEmail,
    city,
    address,
    preferredDate,
    description,
    priority
  };
}

