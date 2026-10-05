import { createHash, randomBytes } from 'node:crypto';
import { authorizeConnectorOwner } from './_connector/ownerAuth.js';
import { parseConnectorBody, requirePost, ConnectorHttpError } from './_connector/http.js';
import { runConnectorHandler } from './_connector/handler.js';

export default async function connectorEnrollHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    requirePost(request); const { body } = parseConnectorBody(request, 32 * 1024);
    const companyId = String(body.companyId ?? '');
    if (body.action !== 'create' || !/^[0-9a-f-]{36}$/i.test(companyId)) throw new ConnectorHttpError('ENROLLMENT_INVALID', 400);
    const { userId, service } = await authorizeConnectorOwner(request, companyId);
    const enrollmentCode = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const codeHash = `\\x${createHash('sha256').update(enrollmentCode).digest('hex')}`;
    const { data, error } = await service.rpc('app_create_connector_enrollment', { p_company_id: companyId, p_user_id: userId, p_code_hash: codeHash, p_expires_at: expiresAt });
    if (error || !data) throw new ConnectorHttpError('ENROLLMENT_REJECTED', 502);
    return { enrollmentId: String(data), enrollmentCode, expiresAt };
  });
}
