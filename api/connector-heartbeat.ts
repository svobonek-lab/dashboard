import { authenticateConnectorHttpRequest } from './_connector/auth.js';
import { ConnectorHttpError } from './_connector/http.js';
import { runConnectorHandler } from './_connector/handler.js';

export default async function connectorHeartbeatHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    const { body, identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector-heartbeat', 'heartbeat');
    const status = typeof body.status === 'string' ? body.status : '';
    const version = typeof body.version === 'string' ? body.version : '';
    if (!['ready', 'paused', 'partial_failure'].includes(status) || !/^\d+\.\d+\.\d+/.test(version)) throw new ConnectorHttpError('HEARTBEAT_INVALID', 400);
    const { error } = await service.rpc('app_connector_heartbeat', { p_connector_id: identity.connectorId, p_status: status, p_version: version });
    if (error) throw new ConnectorHttpError('HEARTBEAT_REJECTED', 502);
    return { accepted: true };
  });
}
