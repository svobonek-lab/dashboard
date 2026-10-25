import { parseConnectorBody, requirePost } from '../http.js';
import { runConnectorHandler } from '../handler.js';
import { getConnectorServiceClient } from '../supabaseAdmin.js';
import { registerConnector } from '../lifecycle.js';

export default async function connectorRegisterHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    requirePost(request);
    const { body } = parseConnectorBody(request, 32 * 1024);
    return registerConnector(getConnectorServiceClient(), body);
  });
}
