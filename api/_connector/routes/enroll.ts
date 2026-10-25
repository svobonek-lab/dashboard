import { createHash, randomBytes } from 'node:crypto';
import { authorizeConnectorOwner } from '../ownerAuth.js';
import { parseConnectorBody, requirePost, ConnectorHttpError } from '../http.js';
import { runConnectorHandler } from '../handler.js';
import { encryptConnectorSecret } from '../secretVault.js';

export default async function connectorEnrollHandler(request: any, response: any) {
  await runConnectorHandler(response, async () => {
    requirePost(request); const { body } = parseConnectorBody(request, 32 * 1024);
    const companyId = String(body.companyId ?? '');
    if (body.action !== 'create' || !/^[0-9a-f-]{36}$/i.test(companyId)) throw new ConnectorHttpError('ENROLLMENT_INVALID', 400);
    const { userId, service } = await authorizeConnectorOwner(request, companyId);
    const enrollmentCode = randomBytes(32).toString('base64url');
    const connectorSecret = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const codeHash = `\\x${createHash('sha256').update(enrollmentCode).digest('hex')}`;
    const secretFingerprint = `\\x${createHash('sha256').update(Buffer.from(connectorSecret, 'base64url')).digest('hex')}`;
    const secretCiphertext = encryptConnectorSecret(connectorSecret);
    const { data, error } = await service.rpc('app_create_connector_enrollment', { p_company_id: companyId, p_user_id: userId, p_code_hash: codeHash, p_secret_fingerprint: secretFingerprint, p_secret_ciphertext: secretCiphertext, p_expires_at: expiresAt });
    if (error || !data) throw new ConnectorHttpError('ENROLLMENT_REJECTED', 502);
    return { enrollmentId: String(data), enrollmentCode, connectorSecret, expiresAt };
  });
}
