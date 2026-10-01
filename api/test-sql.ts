import { unsupportedSqlConnection } from '../lib/integrations/pilotImport.js';

/**
 * Intentionally unavailable until a server-side, read-only connector is
 * reviewed. Returning synthetic tables or rows would mislead a customer into
 * believing that their database is connected.
 */
export default async function testSqlHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  res.status(501).json(unsupportedSqlConnection());
}
