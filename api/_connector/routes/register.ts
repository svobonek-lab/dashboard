import { parseConnectorBody, requirePost, ConnectorHttpError } from '../http.js';
import { runConnectorHandler } from '../handler.js';
import { getConnectorServiceClient } from '../supabaseAdmin.js';
import { validateConnectorRegistration } from '../validation.js';

export default async function connectorRegisterHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    requirePost(request);
    const { body } = parseConnectorBody(request, 32 * 1024);
    const { enrollmentCode, secretFingerprint } = validateConnectorRegistration(body);
    const { data, error } = await getConnectorServiceClient().rpc('app_register_connector', {
      p_enrollment_code: enrollmentCode,
      p_secret_fingerprint: `\\x${secretFingerprint}`,
    });
    if (error || !data?.connector_id || !data?.company_id) throw new ConnectorHttpError('CONNECTOR_REGISTRATION_REJECTED', 401);
    return { connectorId: data.connector_id, companyId: data.company_id };
  });
}
