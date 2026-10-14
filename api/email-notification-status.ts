export default async function emailNotificationStatusHandler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
    return;
  }
  const providerConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  res.status(200).json({
    providerConfigured,
    state: providerConfigured ? 'ready' : 'not_configured',
  });
}
