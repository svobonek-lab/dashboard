import type { SourceSchema, SourceTable } from './types.js';

const UNSUPPORTED_IDENTIFIER = /[\0\r\n;`"\[\]]/u;

function requireKnownIdentifier(identifier: string, known: Set<string>): string {
  if (!identifier || UNSUPPORTED_IDENTIFIER.test(identifier)) throw new Error(`unsupported identifier: ${identifier}`);
  if (!known.has(identifier)) throw new Error(`identifier is not present in inspected schema: ${identifier}`);
  return identifier;
}

export function quotePostgresIdentifier(identifier: string, known: Set<string>): string {
  return `"${requireKnownIdentifier(identifier, known)}"`;
}

export function quoteMysqlIdentifier(identifier: string, known: Set<string>): string {
  return `\`${requireKnownIdentifier(identifier, known)}\``;
}

export function quoteMssqlIdentifier(identifier: string, known: Set<string>): string {
  return `[${requireKnownIdentifier(identifier, known)}]`;
}

export function validatePageLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('page limit must be between 1 and 1000');
  return limit;
}

export function findKnownTable(schema: SourceSchema, schemaName: string, tableName: string): SourceTable {
  const table = schema.tables.find(candidate => candidate.schema === schemaName && candidate.name === tableName);
  if (!table) throw new Error(`table is not present in inspected schema: ${schemaName}.${tableName}`);
  return table;
}

export function knownColumns(table: SourceTable, requested: string[]): Set<string> {
  const available = new Set(table.columns.map(column => column.name));
  for (const column of requested) requireKnownIdentifier(column, available);
  return available;
}

export function normalizeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value])));
}
