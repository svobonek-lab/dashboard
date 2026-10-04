import type { IngestEnvelopeV1 } from '../../shared/connectorProtocol.js';
import { validateCanonicalRecord } from '../../connector/src/protocol/canonical.js';
import { ConnectorHttpError } from './http.js';

const ENVELOPE_FIELDS = new Set(['version', 'connectorId', 'companyId', 'mappingVersion', 'requestId', 'dryRun', 'records']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/;

export function validateIngestEnvelope(value: unknown, identity?: { connectorId: string; companyId: string }): IngestEnvelopeV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('ENVELOPE_INVALID', 400);
  const envelope = value as Record<string, unknown>;
  for (const key of Object.keys(envelope)) if (!ENVELOPE_FIELDS.has(key)) throw new ConnectorHttpError('ENVELOPE_INVALID', 400);
  if (envelope.version !== 1 || !SAFE_ID.test(String(envelope.connectorId ?? '')) || !SAFE_ID.test(String(envelope.companyId ?? ''))
    || !SAFE_ID.test(String(envelope.requestId ?? '')) || !Number.isInteger(envelope.mappingVersion) || Number(envelope.mappingVersion) < 1
    || typeof envelope.dryRun !== 'boolean' || !Array.isArray(envelope.records)) throw new ConnectorHttpError('ENVELOPE_INVALID', 400);
  if (envelope.records.length > 250) throw new ConnectorHttpError('BATCH_TOO_LARGE', 413);
  if (identity && (envelope.connectorId !== identity.connectorId || envelope.companyId !== identity.companyId)) throw new ConnectorHttpError('TENANT_MISMATCH', 403);
  const records = envelope.records.map(record => validateCanonicalRecord(record));
  return { ...envelope, records } as unknown as IngestEnvelopeV1;
}
