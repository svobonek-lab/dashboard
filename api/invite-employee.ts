/**
 * Invitations stay disabled until the reviewed app_invites/app_members
 * contract is available in staging. The old users/employees flow could not
 * authorize a production company safely.
 */
export default async function inviteEmployeeHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  res.status(501).json({
    error: 'Pozvánky budou dostupné po ověření app_invites a app_members v bezpečném stagingu.',
    code: 'APP_INVITES_CONTRACT_PENDING',
  });
}
