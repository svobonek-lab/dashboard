import { parseConnectorBody, requirePost, ConnectorHttpError } from '../http.js';
import { runConnectorHandler } from '../handler.js';
import { getConnectorServiceClient } from '../supabaseAdmin.js';

export default async function connectorRegisterHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    requirePost(request);
    const { body } = parseConnectorBody(request, 32 * 1024);
    const enrollmentCode = typeof body.enrollmentCode === 'string' ? body.enrollmentCode.trim() : '';
    const publicKey = typeof body.publicKey === 'string' ? body.publicKey.trim() : '';
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(enrollmentCode) || !publicKey.startsWith('-----BEGIN PUBLIC KEY-----') || publicKey.length > 4096) {
      throw new ConnectorHttpError('CONNECTOR_REGISTRATION_INVALID', 400);
    }
    const { data, error } = await getConnectorServiceClient().rpc('app_register_connector', {
      p_enrollment_code: enrollmentCode,
      p_public_key: publicKey,
    });
    if (error || !data?.connector_id || !data?.company_id) throw new ConnectorHttpError('CONNECTOR_REGISTRATION_REJECTED', 401);
    return { connectorId: data.connector_id, companyId: data.company_id };
  });
}
