/**
 * Password reset remains delegated to the reviewed Supabase Auth recovery
 * flow. The previous endpoint depended on the removed users/employees model
 * and returned reset links from a privileged server context.
 */
export default async function resetEmployeePasswordHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  res.status(501).json({
    error: 'Obnova hesla probíhá přes ověřený Supabase Auth recovery flow.',
    code: 'AUTH_RECOVERY_CONTRACT_PENDING',
  });
}
