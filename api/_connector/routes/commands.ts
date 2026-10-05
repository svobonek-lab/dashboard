import { authenticateConnectorHttpRequest } from '../auth.js';
import { ConnectorHttpError } from '../http.js';
import { runConnectorHandler } from '../handler.js';

export default async function connectorCommandsHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    const { body, identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector/commands', 'commands');
    if (body.action === 'poll') {
      const { data, error } = await service.rpc('app_get_connector_commands', { p_connector_id: identity.connectorId });
      if (error) throw new ConnectorHttpError('COMMANDS_UNAVAILABLE', 502);
      return { commands: data ?? [] };
    }
    if (body.action === 'acknowledge' && typeof body.commandId === 'string') {
      const { error } = await service.rpc('app_ack_connector_command', { p_connector_id: identity.connectorId, p_command_id: body.commandId });
      if (error) throw new ConnectorHttpError('COMMAND_ACK_REJECTED', 502);
      return { accepted: true };
    }
    throw new ConnectorHttpError('COMMAND_INVALID', 400);
  });
}
