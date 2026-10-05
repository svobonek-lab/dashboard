import { authenticateConnectorHttpRequest } from '../auth.js';
import { ConnectorHttpError } from '../http.js';
import { runConnectorHandler } from '../handler.js';
import { validateRunMetrics, validateSourceSchema } from '../validation.js';

export default async function connectorHeartbeatHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    const { body, identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector/heartbeat', 'heartbeat');
    const status = typeof body.status === 'string' ? body.status : '';
    const version = typeof body.version === 'string' ? body.version : '';
    if (!['mapping_required', 'dry_run_required', 'ready', 'running', 'success', 'paused', 'partial_failure'].includes(status) || !/^\d+\.\d+\.\d+/.test(version)) throw new ConnectorHttpError('HEARTBEAT_INVALID', 400);
    const sourceSchema = body.sourceSchema === undefined ? null : validateSourceSchema(body.sourceSchema);
    const metrics = body.metrics === undefined ? null : validateRunMetrics(body.metrics);
    const { error } = await service.rpc('app_connector_heartbeat', { p_connector_id: identity.connectorId, p_status: status, p_version: version, p_source_schema: sourceSchema, p_metrics: metrics });
    if (error) throw new ConnectorHttpError('HEARTBEAT_REJECTED', 502);
    return { accepted: true };
  });
}
