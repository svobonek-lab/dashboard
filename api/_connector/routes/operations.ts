import { authorizeConnectorMember, authorizeConnectorOwner } from '../ownerAuth.js';
import { BYODB_OPERATION_ENTITY_TYPES, CANONICAL_PAYLOAD_FIELDS } from '../../../shared/connectorProtocol.js';
import { authenticateConnectorHttpRequest } from '../auth.js';
import { ConnectorHttpError, parseConnectorBody, requirePost } from '../http.js';
import { runConnectorHandler } from '../handler.js';
import {
  validateByodbOperationAck,
  validateByodbOperationCreate,
  validateByodbOperationRequest,
  validateByodbPollBatch,
  validateConnectorMapping,
  validateSourceSchema,
} from '../validation.js';

const TERMINAL_ERROR_CODES = new Set(['SOURCE_CONFLICT', 'SOURCE_WRITE_REJECTED', 'MAPPING_STALE', 'SOURCE_UNAVAILABLE']);
const OPERATION_STATES = new Set(['pending', 'processing', 'applied', 'conflict', 'failed']);

function requireByodbReleaseGate(): void {
  if (process.env.ENABLE_BYODB_WRITES !== 'true') throw new ConnectorHttpError('BYODB_RELEASE_GATE_CLOSED', 409);
}

function operationError(code: string): ConnectorHttpError {
  const status = code === 'IDEMPOTENCY_CONFLICT' || code === 'MAPPING_STALE' || code === 'BYODB_WRITE_DISABLED' ? 409
    : code === 'MEMBER_ACCESS_DENIED' || code === 'MEMBER_SCOPE_DENIED' ? 403
      : code === 'CONNECTOR_UNAVAILABLE' || code === 'OPERATION_RETRY' ? 503 : 400;
  return new ConnectorHttpError(code, status);
}

function operationResult(value: unknown): { operationId: string; status: string; createdAt: string; replayed: boolean } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('OPERATION_REJECTED', 502);
  const result = value as Record<string, unknown>;
  if (typeof result.errorCode === 'string') throw operationError(result.errorCode);
  const operationId = String(result.operationId ?? ''), status = String(result.status ?? ''), createdAt = String(result.createdAt ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(operationId) || !OPERATION_STATES.has(status) || Number.isNaN(new Date(createdAt).valueOf()) || typeof result.replayed !== 'boolean') {
    throw new ConnectorHttpError('OPERATION_RESPONSE_INVALID', 502);
  }
  return { operationId, status, createdAt: new Date(createdAt).toISOString(), replayed: result.replayed };
}

function operationList(value: unknown): Array<{ operationId: string; status: string; entityType: string; action: string; createdAt: string; updatedAt: string; errorCode: string | null }> {
  if (!Array.isArray(value) || value.length > 50) throw new ConnectorHttpError('OPERATION_RESPONSE_INVALID', 502);
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ConnectorHttpError('OPERATION_RESPONSE_INVALID', 502);
    const row = item as Record<string, unknown>;
    const operationId = String(row.operationId ?? ''), status = String(row.status ?? '');
    const entityType = String(row.entityType ?? ''), action = String(row.action ?? '');
    const createdAt = String(row.createdAt ?? ''), updatedAt = String(row.updatedAt ?? '');
    const errorCode = row.errorCode === null ? null : String(row.errorCode ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(operationId) || !OPERATION_STATES.has(status)
      || !BYODB_OPERATION_ENTITY_TYPES.includes(entityType as typeof BYODB_OPERATION_ENTITY_TYPES[number]) || !['create', 'update', 'delete'].includes(action)
      || Number.isNaN(new Date(createdAt).valueOf()) || Number.isNaN(new Date(updatedAt).valueOf())
      || (errorCode !== null && !TERMINAL_ERROR_CODES.has(errorCode))) throw new ConnectorHttpError('OPERATION_RESPONSE_INVALID', 502);
    return { operationId, status, entityType, action, createdAt: new Date(createdAt).toISOString(), updatedAt: new Date(updatedAt).toISOString(), errorCode };
  });
}

export function contextResponse(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('DATABASE_MODE_INVALID', 502);
  const row = value as Record<string, unknown>;
  const mode = row.mode;
  const driver = row.driver === null ? null : row.driver;
  const connectorId = row.connectorId === null ? null : row.connectorId;
  const mappingVersion = row.mappingVersion === null ? null : row.mappingVersion;
  const mappedTargets = row.mappedTargets;
  const companyMappingVersion = row.companyMappingVersion === null ? null : row.companyMappingVersion;
  const companyMappedTargets = row.companyMappedTargets;
  if (!['managed_cloud', 'byodb'].includes(String(mode))
    || (driver !== null && !['postgres', 'mysql', 'mariadb', 'mssql'].includes(String(driver)))
    || (connectorId !== null && (typeof connectorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(connectorId)))
    || (mappingVersion !== null && (!Number.isInteger(mappingVersion) || Number(mappingVersion) < 1))
    || !Array.isArray(mappedTargets) || mappedTargets.length > 64 || mappedTargets.some(target => typeof target !== 'string' || !CANONICAL_PAYLOAD_FIELDS.lead.includes(target))
    || (companyMappingVersion !== null && (!Number.isInteger(companyMappingVersion) || Number(companyMappingVersion) < 1))
    || !Array.isArray(companyMappedTargets) || companyMappedTargets.length > 64 || companyMappedTargets.some(target => typeof target !== 'string' || !CANONICAL_PAYLOAD_FIELDS.company.includes(target)))
    throw new ConnectorHttpError('DATABASE_MODE_INVALID', 502);
  return { mode, driver, connectorId, mappingVersion, mappedTargets, companyMappingVersion, companyMappedTargets, writeEnabled: row.writeEnabled === true, connectorStatus: typeof row.connectorStatus === 'string' ? row.connectorStatus.slice(0, 40) : null };
}

function projectionRecords(value: unknown, entityType: 'company' | 'lead' = 'lead') {
  if (!Array.isArray(value) || value.length > 5000) throw new ConnectorHttpError('BYODB_RECORDS_INVALID', 502);
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ConnectorHttpError('BYODB_RECORDS_INVALID', 502);
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some(key => !['externalId', 'fingerprint', 'payload'].includes(key))
      || typeof row.externalId !== 'string' || !row.externalId || row.externalId.length > 512
      || typeof row.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(row.fingerprint)
      || !row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload)) throw new ConnectorHttpError('BYODB_RECORDS_INVALID', 502);
    const payload = row.payload as Record<string, unknown>;
    if (Object.keys(payload).some(key => !CANONICAL_PAYLOAD_FIELDS[entityType].includes(key))
      || Object.values(payload).some(field => field !== null && !['string', 'number', 'boolean'].includes(typeof field))) throw new ConnectorHttpError('BYODB_RECORDS_INVALID', 502);
    return { externalId: row.externalId, fingerprint: row.fingerprint, payload };
  });
}

export default async function byodbOperationsHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    requirePost(request);
    const { body } = parseConnectorBody(request, 32 * 1024);
    const operationRequest = validateByodbOperationRequest(body);

    if (operationRequest.action === 'context') {
      const { userId, service } = await authorizeConnectorMember(request, operationRequest.companyId);
      const { data, error } = await service.rpc('app_get_byodb_context', { p_company_id: operationRequest.companyId, p_user_id: userId });
      if (error && ['PGRST202', '42883'].includes(String(error.code))) return { mode: 'managed_cloud', driver: null, connectorId: null, mappingVersion: null, mappedTargets: [], companyMappingVersion: null, companyMappedTargets: [], writeEnabled: false, connectorStatus: null };
      if (error) throw new ConnectorHttpError('DATABASE_MODE_UNAVAILABLE', 503);
      return contextResponse(data);
    }

    if (operationRequest.action === 'records') {
      const { userId, service } = await authorizeConnectorMember(request, operationRequest.companyId);
      const entityType = operationRequest.entityType ?? 'lead';
      const { data, error } = await service.rpc('app_list_byodb_records', { p_company_id: operationRequest.companyId, p_user_id: userId, p_entity_type: entityType });
      if (error) throw new ConnectorHttpError('BYODB_RECORDS_UNAVAILABLE', 503);
      return { records: projectionRecords(data, entityType) };
    }

    if (operationRequest.action === 'set_mode') {
      requireByodbReleaseGate();
      const { userId, service } = await authorizeConnectorOwner(request, operationRequest.companyId);
      const { data, error } = await service.rpc('app_set_company_database_mode', {
        p_company_id: operationRequest.companyId, p_user_id: userId, p_connector_id: operationRequest.connectorId,
        p_mode: operationRequest.mode, p_driver: operationRequest.driver, p_write_enabled: operationRequest.writeEnabled,
      });
      if (error || data !== true) throw new ConnectorHttpError('DATABASE_MODE_REJECTED', 409);
      return { accepted: true, mode: operationRequest.mode, writeEnabled: operationRequest.writeEnabled };
    }

    if (operationRequest.action === 'poll') {
      requireByodbReleaseGate();
      const { identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector/operations', 'operations');
      const { data: connector, error: connectorError } = await service.from('app_connectors')
        .select('source_schema').eq('id', identity.connectorId).eq('company_id', identity.companyId).is('revoked_at', null).maybeSingle();
      if (connectorError || !connector?.source_schema) throw new ConnectorHttpError('CONNECTOR_UNAVAILABLE', 503);
      const sourceSchema = validateSourceSchema(connector.source_schema);
      const { data, error } = await service.rpc('app_poll_byodb_operations', { p_connector_id: identity.connectorId, p_limit: operationRequest.limit ?? 25 });
      if (error) throw new ConnectorHttpError('OPERATIONS_UNAVAILABLE', 502);
      const operations = validateByodbPollBatch(data, sourceSchema);
      if (operations.length > (operationRequest.limit ?? 25)) throw new ConnectorHttpError('OPERATION_RESPONSE_INVALID', 502);
      return { operations };
    }

    if (operationRequest.action === 'ack') {
      const { identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector/operations', 'operations');
      const ack = validateByodbOperationAck(operationRequest.ack);
      const { data, error } = await service.rpc('app_ack_byodb_operation', {
        p_connector_id: identity.connectorId,
        p_operation_id: ack.operationId,
        p_status: ack.status,
        p_source_version: ack.sourceVersion ?? null,
        p_error_code: ack.errorCode ?? null,
        p_projection: ack.projection ?? null,
      });
      if (error || data !== true) throw new ConnectorHttpError('OPERATION_ACK_REJECTED', 409);
      return { accepted: true };
    }

    const { userId, userEmail, role, service } = await authorizeConnectorMember(request, operationRequest.companyId);
    if (operationRequest.action === 'list') {
      const { data, error } = await service.rpc('app_list_byodb_operations', {
        p_company_id: operationRequest.companyId,
        p_user_id: userId,
        p_limit: operationRequest.limit ?? 25,
        p_cursor: operationRequest.cursor ?? null,
      });
      if (error) throw new ConnectorHttpError('OPERATIONS_UNAVAILABLE', 502);
      return { operations: operationList(data) };
    }

    requireByodbReleaseGate();
    const { data: connector, error: connectorError } = await service.from('app_connectors')
      .select('source_schema').eq('id', operationRequest.connectorId).eq('company_id', operationRequest.companyId)
      .is('revoked_at', null).maybeSingle();
    if (connectorError || !connector?.source_schema) throw new ConnectorHttpError('CONNECTOR_UNAVAILABLE', 409);
    const requestedVersion = operationRequest.operation && typeof operationRequest.operation === 'object'
      ? (operationRequest.operation as Record<string, unknown>).mappingVersion : undefined;
    if (!Number.isInteger(requestedVersion) || Number(requestedVersion) < 1) throw new ConnectorHttpError('OPERATION_INVALID', 400);
    const { data: savedMapping, error: mappingError } = await service.from('app_connector_mappings')
      .select('definition,approved_at').eq('connector_id', operationRequest.connectorId).eq('company_id', operationRequest.companyId)
      .eq('version', Number(requestedVersion)).maybeSingle();
    if (mappingError || !savedMapping?.approved_at) throw new ConnectorHttpError('MAPPING_NOT_APPROVED', 409);
    const sourceSchema = validateSourceSchema(connector.source_schema);
    const mapping = validateConnectorMapping(savedMapping.definition, sourceSchema);
    const operation = validateByodbOperationCreate(operationRequest.operation, role, mapping);
    const { data, error } = await service.rpc('app_create_byodb_operation', {
      p_company_id: operationRequest.companyId,
      p_user_id: userId,
      p_user_email: userEmail,
      p_connector_id: operationRequest.connectorId,
      p_operation: operation,
    });
    if (error) throw new ConnectorHttpError('OPERATION_REJECTED', 502);
    return operationResult(data);
  });
}
