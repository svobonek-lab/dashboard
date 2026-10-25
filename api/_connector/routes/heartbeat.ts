import { authenticateConnectorHttpRequest } from '../auth.js';
import { runConnectorHandler } from '../handler.js';
import { recordConnectorHeartbeat } from '../lifecycle.js';

export default async function connectorHeartbeatHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    const { body, identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector/heartbeat', 'heartbeat');
    return recordConnectorHeartbeat(service, identity, body);
  });
}
