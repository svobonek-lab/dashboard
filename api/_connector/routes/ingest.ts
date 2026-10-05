import { authenticateConnectorHttpRequest } from '../auth.js';
import { ConnectorHttpError } from '../http.js';
import { runConnectorHandler } from '../handler.js';
import { validateIngestEnvelope } from '../validation.js';

export default async function connectorIngestHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    const { body, identity, service } = await authenticateConnectorHttpRequest(request, '/api/connector/ingest', 'ingest');
    const envelope = validateIngestEnvelope(body, identity);
    const { data, error } = await service.rpc('app_ingest_connector_batch', {
      p_connector_id: identity.connectorId,
      p_mapping_version: envelope.mappingVersion,
      p_request_id: envelope.requestId,
      p_dry_run: envelope.dryRun,
      p_records: envelope.records,
      p_summary: envelope.dryRunSummary ?? null,
    });
    if (error) throw new ConnectorHttpError('INGEST_REJECTED', 502);
    return data;
  });
}
