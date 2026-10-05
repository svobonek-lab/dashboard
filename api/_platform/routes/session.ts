import { authorizePlatformRequest } from '../auth.js';
import { runPlatformHandler } from '../handler.js';
import { requireGet } from '../http.js';

export default async function platformSessionHandler(request: any, response: any): Promise<void> {
  await runPlatformHandler(response, async () => {
    requireGet(request);
    await authorizePlatformRequest(request);
    return { role: 'platform_admin', active: true };
  });
}
