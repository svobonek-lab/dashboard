export const INVITE_PASSWORD_SET_KEY = 'invite_password_set';

export interface InviteAwareAuthUser {
  id: string;
  invited_at?: string | null;
  user_metadata?: Record<string, unknown>;
}

function readAuthType(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const queryType = url.searchParams.get('type');
    if (queryType) return queryType;
    return new URLSearchParams(url.hash.replace(/^#/, '')).get('type') || '';
  } catch {
    return '';
  }
}

export function isInviteCallbackUrl(rawUrl: string): boolean {
  return readAuthType(rawUrl) === 'invite';
}

export function requiresInvitePasswordSetup(user: InviteAwareAuthUser | null | undefined, rawUrl: string): boolean {
  if (!user) return false;
  const metadata = user.user_metadata || {};
  if (metadata[INVITE_PASSWORD_SET_KEY] === true) return false;
  return isInviteCallbackUrl(rawUrl) || Boolean(user.invited_at) || typeof metadata.invite_id === 'string';
}

export function shouldLoadWorkspaceIdentity(user: InviteAwareAuthUser | null | undefined, rawUrl: string): boolean {
  return Boolean(user) && !requiresInvitePasswordSetup(user, rawUrl);
}

export function buildCompletedInviteMetadata(
  current: Record<string, unknown> | null | undefined,
  completedAt: string,
): Record<string, unknown> & { invite_password_set: true; invite_password_set_at: string } {
  return {
    ...(current || {}),
    invite_password_set: true,
    invite_password_set_at: completedAt,
  };
}
