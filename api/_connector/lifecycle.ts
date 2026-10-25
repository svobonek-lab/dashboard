import { ConnectorHttpError } from './http.js';
import type { AuthenticatedConnectorIdentity } from './signature.js';
import { validateConnectorRegistration, validateIngestEnvelope, validateRunMetrics, validateSourceSchema } from './validation.js';

type ConnectorService = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: any; error: unknown }>;
};

export async function registerConnector(service: ConnectorService, value: unknown): Promise<{ connectorId: string; companyId: string }> {
  const { enrollmentCode, secretFingerprint } = validateConnectorRegistration(value);
  const { data, error } = await service.rpc('app_register_connector', {
    p_enrollment_code: enrollmentCode,
    p_secret_fingerprint: `\\x${secretFingerprint}`,
  });
  if (error || !data?.connector_id || !data?.company_id) throw new ConnectorHttpError('CONNECTOR_REGISTRATION_REJECTED', 401);
  return { connectorId: data.connector_id, companyId: data.company_id };
}

export async function recordConnectorHeartbeat(service: ConnectorService, identity: AuthenticatedConnectorIdentity, value: Record<string, unknown>): Promise<{ accepted: true }> {
  const status = typeof value.status === 'string' ? value.status : '';
  const version = typeof value.version === 'string' ? value.version : '';
  if (!['mapping_required', 'dry_run_required', 'ready', 'running', 'success', 'paused', 'partial_failure'].includes(status) || !/^\d+\.\d+\.\d+/.test(version)) throw new ConnectorHttpError('HEARTBEAT_INVALID', 400);
  const sourceSchema = value.sourceSchema === undefined ? null : validateSourceSchema(value.sourceSchema);
  const metrics = value.metrics === undefined ? null : validateRunMetrics(value.metrics);
  const { error } = await service.rpc('app_connector_heartbeat', {
    p_connector_id: identity.connectorId, p_status: status, p_version: version, p_source_schema: sourceSchema, p_metrics: metrics,
  });
  if (error) throw new ConnectorHttpError('HEARTBEAT_REJECTED', 502);
  return { accepted: true };
}

export async function ingestConnectorBatch(service: ConnectorService, identity: AuthenticatedConnectorIdentity, value: unknown): Promise<unknown> {
  const envelope = validateIngestEnvelope(value, identity);
  const { data, error } = await service.rpc('app_ingest_connector_batch', {
    p_connector_id: identity.connectorId, p_mapping_version: envelope.mappingVersion, p_request_id: envelope.requestId,
    p_dry_run: envelope.dryRun, p_records: envelope.records, p_summary: envelope.dryRunSummary ?? null,
  });
  if (error) throw new ConnectorHttpError('INGEST_REJECTED', 502);
  return data;
}
