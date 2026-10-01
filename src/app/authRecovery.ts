export function buildRecoveryRequest(rawEmail: string): { email: string } {
  const email = rawEmail.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Zadejte platný e-mail.');
  return { email };
}

export function parseRecoveryResponse(value: unknown): string {
  const response = value as { requested?: unknown; message?: unknown } | null;
  if (!response || response.requested !== true) {
    throw new Error('Server odeslání obnovy nepotvrdil.');
  }
  return typeof response.message === 'string' && response.message.trim()
    ? response.message
    : 'Pokud účet existuje, přijde na něj bezpečný odkaz pro obnovu hesla.';
}

export function validateNewPassword(rawPassword: string): string {
  if (rawPassword.length < 10) throw new Error('Nové heslo musí mít alespoň 10 znaků.');
  return rawPassword;
}
