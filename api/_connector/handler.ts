import { connectorErrorResponse } from './http.js';

export async function runConnectorHandler(response: any, operation: () => Promise<unknown>): Promise<void> {
  try {
    response.status(200).json(await operation());
  } catch (error) {
    const safe = connectorErrorResponse(error);
    response.status(safe.status).json(safe.body);
  }
}
