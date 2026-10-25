import { generateSmartMappings } from '../../src/shared/integrations/fieldMapping.js';
import type { SQLTestResult } from '../../src/shared/model/sqlConnector.js';
export { unsupportedSqlConnection } from '../../src/shared/api/integrationFallback.js';
import Papa from 'papaparse';

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
  const source = input.replace(/^\uFEFF/, '');
  if (!source.trim()) {
    return { headers: [], rows: [], mapping: {}, imported: false, source: 'csv-dry-run' };
  }
  const parsed = Papa.parse<Record<string, string>>(source, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: detectDelimiter(source.split(/\r?\n/, 1)[0]),
    transformHeader: (header) => header.trim(),
  });
  const fatal = parsed.errors.find((error) => error.type === 'Quotes' || error.code === 'TooFewFields' || error.code === 'TooManyFields');
  if (fatal) throw new Error(`CSV nelze bezpečně načíst: ${fatal.message}`);
  const headers = parsed.meta.fields || [];
  const rows = parsed.data;
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
export function createImportFingerprint(companyId: string, fileName: string, content: string, mapping: Record<string, unknown> = {}): string {
  const stableMapping = JSON.stringify(Object.entries(mapping).sort(([left], [right]) => left.localeCompare(right)));
  const value = `${companyId}\u0000${fileName}\u0000${content}\u0000${stableMapping}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `csv_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
