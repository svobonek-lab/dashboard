import { generateSmartMappings } from './fieldMapping';
import type { SQLTestResult } from './sqlConnector';

export interface CsvDryRunResult {
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<string, { targetField: string; confidence: number }>;
  imported: false;
  source: 'csv-dry-run';
}

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function parseLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }

  values.push(value.trim());
  return values;
}

export function parseCsvDryRun(input: string): CsvDryRunResult {
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return { headers: [], rows: [], mapping: {}, imported: false, source: 'csv-dry-run' };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line, delimiter);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
  const suggestions = generateSmartMappings(headers, rows[0]);
  const mapping = suggestions.reduce<CsvDryRunResult['mapping']>((result, suggestion) => {
    result[suggestion.sourceColumn] = {
      targetField: suggestion.targetField,
      confidence: suggestion.confidence || 0,
    };
    return result;
  }, {});

  return { headers, rows, mapping, imported: false, source: 'csv-dry-run' };
}

/**
 * Stable, tenant-scoped idempotency key for a dry-run/import request.
 * This is an identifier, not a credential or a security hash.
 */
export function createImportFingerprint(companyId: string, fileName: string, content: string): string {
  const value = `${companyId}\u0000${fileName}\u0000${content}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `csv_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function unsupportedSqlConnection(): SQLTestResult {
  return {
    success: false,
    latencyMs: 0,
    message: 'Přímé SQL připojení zatím není aktivní. Použijte bezpečný CSV/API import v režimu dry-run.',
    foundProjectsCount: 0,
    tablesCount: 0,
    recordsCount: 0,
    availableTables: [],
    sampleColumns: [],
    sampleRows: [],
    connectedStatus: 'disconnected',
    testedAt: new Date().toISOString(),
  };
}
