import { authenticateConnectorHttpRequest } from '../auth.js';
import { runConnectorHandler } from '../handler.js';
import { ingestConnectorBatch } from '../lifecycle.js';

export default async function connectorIngestHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    const { body, identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector/ingest', 'ingest');
    return ingestConnectorBatch(service, identity, body);
  });
}
