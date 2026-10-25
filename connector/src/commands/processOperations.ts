import type { CanonicalRecordV1, ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';
import type { MappedSourceOperation } from '../adapters/mappedOperations.js';
import type { SourceAdapter, SourceSchema } from '../adapters/types.js';

export interface OperationDeliveryApi {
  acknowledgeOperation(ack: {
    operationId: string;
    status: 'applied' | 'conflict' | 'failed';
    sourceVersion?: string;
    errorCode?: 'SOURCE_CONFLICT' | 'SOURCE_WRITE_REJECTED' | 'MAPPING_STALE' | 'SOURCE_UNAVAILABLE';
  }, projection?: CanonicalRecordV1 | null): Promise<void>;
}

export async function processByodbOperations(
  operations: MappedSourceOperation[],
  mapping: ConnectorMappingDefinitionV1 | null,
  adapter: SourceAdapter,
  schema: SourceSchema,
  api: OperationDeliveryApi,
): Promise<{ applied: number; conflicts: number; failed: number; pending: number }> {
  const result = { applied: 0, conflicts: 0, failed: 0, pending: 0 };
  for (const operation of operations) {
    if (!mapping || operation.mappingVersion !== mapping.mappingVersion || operation.entityType !== mapping.entityType) {
      await api.acknowledgeOperation({ operationId: operation.operationId, status: 'failed', errorCode: 'MAPPING_STALE' });
      result.failed++;
      continue;
    }
    let applied;
    try { applied = await adapter.applyMappedOperation(operation, mapping, schema); }
    catch (error) {
      const code = terminalWriteError(error);
      if (!code) { result.pending += operations.length - result.applied - result.conflicts - result.failed; break; }
      await api.acknowledgeOperation({ operationId: operation.operationId, status: 'failed', errorCode: code });
      result.failed++;
      continue;
    }
    if (applied.status === 'conflict') {
      await api.acknowledgeOperation({ operationId: operation.operationId, status: 'conflict', errorCode: 'SOURCE_CONFLICT' });
      result.conflicts++;
    } else {
      if (!applied.sourceVersion) throw new Error('SOURCE_WRITE_REJECTED');
      await api.acknowledgeOperation({ operationId: operation.operationId, status: 'applied', sourceVersion: applied.sourceVersion }, applied.record ?? null);
      result.applied++;
    }
  }
  return result;
}

function terminalWriteError(error: unknown): 'SOURCE_WRITE_REJECTED' | null {
  if (!(error instanceof Error)) return null;
  return new Set([
    'OPERATION_INVALID', 'OPERATION_MAPPING_INVALID', 'OPERATION_VERSION_INVALID', 'OPERATION_REQUIRED_FIELD_MISSING',
    'OPERATION_STABLE_PRIMARY_KEY_REQUIRED', 'OPERATION_STABLE_EXTERNAL_KEY_UNSUPPORTED', 'OPERATION_CREATE_REQUIRED_COLUMN_MISSING',
    'OPERATION_ROLE_DENIED', 'SOURCE_ROW_INVALID',
  ]).has(error.message) ? 'SOURCE_WRITE_REJECTED' : null;
}
