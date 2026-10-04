import { CANONICAL_PAYLOAD_FIELDS, type JsonValue } from '../../../shared/connectorProtocol.js';
import type { SourceSchema } from '../adapters/types.js';
import { findKnownTable, knownColumns } from '../adapters/sqlSafety.js';
import { fingerprintCanonicalRecord, validateCanonicalRecord } from '../protocol/canonical.js';
import type { CompiledMapping, EntityMappingV1, FieldConversion, MappingIssue } from './types.js';

const MAPPING_FIELDS = new Set(['version', 'mappingVersion', 'entityType', 'sourceSystem', 'schema', 'table', 'externalIdColumn', 'updatedAtColumn', 'deletedAtColumn', 'fields']);
const SECRET_LIKE = /password|secret|token|private[_-]?key|api[_-]?key/i;

function nonEmpty(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function convert(value: unknown, conversion: FieldConversion): { ok: true; value: JsonValue } | { ok: false; code: MappingIssue['code'] } {
  switch (conversion.kind) {
    case 'text':
      return { ok: true, value: String(value).trim().normalize('NFC') };
    case 'number': {
      const number = typeof value === 'number' ? value : Number(String(value).trim());
      return Number.isFinite(number) ? { ok: true, value: number } : { ok: false, code: 'CONVERSION_INVALID' };
    }
    case 'boolean': {
      const normalized = typeof value === 'boolean' ? value : ['true', '1', 'yes', 'ano'].includes(String(value).trim().toLowerCase())
        ? true
        : ['false', '0', 'no', 'ne'].includes(String(value).trim().toLowerCase()) ? false : null;
      if (normalized === null) return { ok: false, code: 'CONVERSION_INVALID' };
      return { ok: true, value: conversion.invert ? !normalized : normalized };
    }
    case 'datetime': {
      const date = new Date(String(value));
      return Number.isNaN(date.valueOf()) ? { ok: false, code: 'CONVERSION_INVALID' } : { ok: true, value: date.toISOString() };
    }
    case 'email': {
      const email = String(value).trim().toLowerCase();
      return /^\S+@\S+\.\S+$/.test(email) ? { ok: true, value: email } : { ok: false, code: 'CONVERSION_INVALID' };
    }
    case 'phone': {
      const phone = String(value).trim().replace(/[\s().-]/g, '');
      return /^\+?[0-9]{6,20}$/.test(phone) ? { ok: true, value: phone } : { ok: false, code: 'CONVERSION_INVALID' };
    }
    case 'currency': {
      const separator = conversion.decimalSeparator ?? '.';
      let raw = String(value).replace(/[^0-9,.-]/g, '');
      raw = separator === ',' ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
      const amount = Number(raw);
      return Number.isFinite(amount) ? { ok: true, value: amount } : { ok: false, code: 'CONVERSION_INVALID' };
    }
    case 'enum': {
      const key = String(value).trim();
      return Object.hasOwn(conversion.values, key) ? { ok: true, value: conversion.values[key] } : { ok: false, code: 'ENUM_VALUE_UNKNOWN' };
    }
  }
}

export function compileMapping(mapping: EntityMappingV1, schema: SourceSchema): CompiledMapping {
  for (const key of Object.keys(mapping as unknown as Record<string, unknown>)) {
    if (!MAPPING_FIELDS.has(key)) throw new Error(`unknown mapping field: ${key}`);
  }
  if (mapping.version !== 1 || !Number.isInteger(mapping.mappingVersion) || mapping.mappingVersion < 1) throw new Error('mapping version is invalid');
  const sourceSystem = nonEmpty(mapping.sourceSystem, 'sourceSystem');
  const table = findKnownTable(schema, nonEmpty(mapping.schema, 'schema'), nonEmpty(mapping.table, 'table'));
  const sourceColumns = [mapping.externalIdColumn, mapping.updatedAtColumn, mapping.deletedAtColumn, ...mapping.fields.map(rule => rule.sourceColumn)].filter((value): value is string => Boolean(value));
  knownColumns(table, sourceColumns);
  const allowedTargets = new Set(CANONICAL_PAYLOAD_FIELDS[mapping.entityType]);
  const usedTargets = new Set<string>();
  for (const rule of mapping.fields) {
    if (!allowedTargets.has(rule.targetField)) throw new Error(`unknown destination field: ${rule.targetField}`);
    if (usedTargets.has(rule.targetField)) throw new Error(`duplicate target field: ${rule.targetField}`);
    usedTargets.add(rule.targetField);
    if (rule.conversion.kind === 'enum') {
      for (const [key, value] of Object.entries(rule.conversion.values)) {
        if (SECRET_LIKE.test(key) || SECRET_LIKE.test(value)) throw new Error('secret-like mapping key or value is not allowed');
      }
    }
  }

  const definition = { ...mapping, sourceSystem };
  return {
    definition,
    mapRow(row) {
      const issues: MappingIssue[] = [];
      const external = row[mapping.externalIdColumn];
      if (external === null || external === undefined || !String(external).trim()) {
        issues.push({ sourceColumn: mapping.externalIdColumn, code: 'EXTERNAL_ID_MISSING' });
      }
      const payload: Record<string, JsonValue> = {};
      for (const rule of mapping.fields) {
        const raw = row[rule.sourceColumn];
        if (raw === null || raw === undefined || String(raw).trim() === '') {
          if (rule.required) issues.push({ sourceColumn: rule.sourceColumn, targetField: rule.targetField, code: 'REQUIRED_VALUE_MISSING' });
          continue;
        }
        const converted = convert(raw, rule.conversion);
        if (!converted.ok) {
          issues.push({ sourceColumn: rule.sourceColumn, targetField: rule.targetField, code: converted.code });
          continue;
        }
        payload[rule.targetField] = converted.value;
      }
      if (mapping.deletedAtColumn && row[mapping.deletedAtColumn]) payload.archived = true;
      if (issues.length) return { record: null, issues };
      const partial = {
        version: 1 as const,
        type: mapping.entityType,
        sourceSystem,
        sourceTable: `${mapping.schema}.${mapping.table}`,
        externalId: String(external).trim(),
        sourceUpdatedAt: mapping.updatedAtColumn && row[mapping.updatedAtColumn] ? new Date(String(row[mapping.updatedAtColumn])).toISOString() : undefined,
        fingerprint: '0'.repeat(64),
        payload,
      };
      partial.fingerprint = fingerprintCanonicalRecord(partial);
      return { record: validateCanonicalRecord(partial), issues };
    },
  };
}
