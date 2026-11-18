import { resolveEmailProviderConfig } from './_email-provider-config.js';

export default async function emailNotificationStatusHandler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
    return;
  }
  const providerConfigured = Boolean(resolveEmailProviderConfig(process.env));
  res.status(200).json({
    providerConfigured,
    state: providerConfigured ? 'ready' : 'not_configured',
  });
}
