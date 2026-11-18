export type EmailProviderConfig =
  | { kind: 'resend'; apiKey: string; from: string }
  | { kind: 'gmail_smtp'; user: string; appPassword: string; from: string; allowedRecipients: readonly string[] };

const STAGING_BRANCH = 'codex/managed-cloud-onboarding';
const EMAIL_ADDRESS = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

export function resolveEmailProviderConfig(env: NodeJS.ProcessEnv): EmailProviderConfig | null {
  if (env.STAGING_EMAIL_PROVIDER?.trim()) {
    if (env.STAGING_EMAIL_PROVIDER !== 'gmail_smtp'
      || env.VERCEL_ENV !== 'preview'
      || env.VERCEL_GIT_COMMIT_REF !== STAGING_BRANCH) return null;

    const user = env.STAGING_GMAIL_USER?.trim().toLowerCase();
    const from = env.EMAIL_FROM?.trim().toLowerCase();
    const appPassword = env.STAGING_GMAIL_APP_PASSWORD;
    const recipients = env.STAGING_EMAIL_ALLOWED_RECIPIENTS?.split(',').map(value => value.trim().toLowerCase()) || [];
    if (!user || !EMAIL_ADDRESS.test(user) || from !== user || !appPassword
      || recipients.length !== 4 || new Set(recipients).size !== 4
      || recipients.some(value => !EMAIL_ADDRESS.test(value))) return null;
    return { kind: 'gmail_smtp', user, appPassword, from, allowedRecipients: recipients };
  }

  const apiKey = env.EMAIL_PROVIDER_API_KEY || env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  return apiKey && from ? { kind: 'resend', apiKey, from } : null;
}
