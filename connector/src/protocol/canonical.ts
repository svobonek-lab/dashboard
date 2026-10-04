import { createHash } from 'node:crypto';

import {
  CANONICAL_ENTITY_TYPES,
  CANONICAL_PAYLOAD_FIELDS,
  type CanonicalRecordV1,
  type JsonValue,
} from '../../../shared/connectorProtocol.js';

const TOP_LEVEL_FIELDS = new Set([
  'version',
  'type',
  'sourceSystem',
  'sourceTable',
  'externalId',
  'sourceUpdatedAt',
  'fingerprint',
  'payload',
]);

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim().normalize('NFC');
}

function normalizeJson(value: unknown, path: string): JsonValue {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.normalize('NFC');
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path} must be JSON-safe`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => normalizeJson(item, `${path}[${index}]`));
  if (typeof value === 'object') {
    const normalized: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child === undefined) throw new Error(`${path}.${key} must be JSON-safe`);
      normalized[key.normalize('NFC')] = normalizeJson(child, `${path}.${key}`);
    }
    return normalized;
  }
  throw new Error(`${path} must be JSON-safe`);
}

function normalizeTimestamp(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  const raw = requireNonEmptyString(value, field);
  const timestamp = new Date(raw);
  if (Number.isNaN(timestamp.valueOf())) throw new Error(`${field} must be an ISO-8601 timestamp`);
  return timestamp.toISOString();
}

function sorted(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, sorted(child)]),
    );
  }
  return value;
}

export function validateCanonicalRecord(value: unknown): CanonicalRecordV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('record must be an object');
  const candidate = value as Record<string, unknown>;
  for (const key of Object.keys(candidate)) {
    if (!TOP_LEVEL_FIELDS.has(key)) throw new Error(`unknown field: ${key}`);
  }
  if (candidate.version !== 1) throw new Error('version must be 1');
  if (typeof candidate.type !== 'string' || !CANONICAL_ENTITY_TYPES.includes(candidate.type as never)) {
    throw new Error('type is not supported');
  }
  const type = candidate.type as CanonicalRecordV1['type'];
  if (!candidate.payload || typeof candidate.payload !== 'object' || Array.isArray(candidate.payload)) {
    throw new Error('payload must be an object');
  }
  const allowed = new Set(CANONICAL_PAYLOAD_FIELDS[type]);
  for (const key of Object.keys(candidate.payload as Record<string, unknown>)) {
    if (!allowed.has(key)) throw new Error(`unknown field: ${key}`);
  }
  const fingerprint = requireNonEmptyString(candidate.fingerprint, 'fingerprint').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) throw new Error('fingerprint must be a SHA-256 hex digest');
  const payload = normalizeJson(candidate.payload, 'payload');
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw new Error('payload must be an object');

  return {
    version: 1,
    type,
    sourceSystem: requireNonEmptyString(candidate.sourceSystem, 'sourceSystem'),
    sourceTable: requireNonEmptyString(candidate.sourceTable, 'sourceTable'),
    externalId: requireNonEmptyString(candidate.externalId, 'externalId'),
    sourceUpdatedAt: normalizeTimestamp(candidate.sourceUpdatedAt, 'sourceUpdatedAt'),
    fingerprint,
    payload,
  };
}

export function fingerprintCanonicalRecord(record: CanonicalRecordV1): string {
  const normalized = normalizeJson({
    version: record.version,
    type: record.type,
    sourceSystem: record.sourceSystem,
    sourceTable: record.sourceTable,
    externalId: record.externalId,
    sourceUpdatedAt: record.sourceUpdatedAt ?? null,
    payload: record.payload,
  }, 'record');
  return createHash('sha256').update(JSON.stringify(sorted(normalized))).digest('hex');
}
