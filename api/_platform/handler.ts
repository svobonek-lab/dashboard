import { platformErrorResponse } from './http.js';

export async function runPlatformHandler(response: any, operation: () => Promise<unknown>): Promise<void> {
  try {
    response.status(200).json(await operation());
  } catch (error) {
    const safe = platformErrorResponse(error);
    response.status(safe.status).json(safe.body);
  }
}
