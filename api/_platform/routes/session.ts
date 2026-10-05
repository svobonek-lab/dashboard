import { authorizePlatformRequest, recordPlatformAudit } from '../auth.js';
import { runPlatformHandler } from '../handler.js';
import { requireGet } from '../http.js';

export default async function platformSessionHandler(request: any, response: any): Promise<void> {
  await runPlatformHandler(response, async () => {
    requireGet(request);
    const { userId, service } = await authorizePlatformRequest(request);
    await recordPlatformAudit(service, {
      actorUserId: userId,
      action: 'platform_session.verified',
      reasonCode: 'platform_api_request',
    });
    return { role: 'platform_admin', active: true };
  });
}
