export interface PlatformIdentity {
  role: 'platform_admin';
  active: true;
}

export interface WorkspaceIdentity {
  organization_id: string;
  role: string;
}

export async function readPlatformIdentity(client: { rpc: (name: string) => PromiseLike<{ data: unknown; error: unknown }> }): Promise<PlatformIdentity | null> {
  const { data, error } = await client.rpc('app_get_my_platform_role');
  if (error || !data || typeof data !== 'object') return null;
  const candidate = data as { role?: unknown; active?: unknown };
  return candidate.role === 'platform_admin' && candidate.active === true
    ? { role: 'platform_admin', active: true }
    : null;
}

export function resolveApplicationIdentity(
  platform: { role: 'platform_admin' | null; active: boolean } | null,
  workspace: WorkspaceIdentity | null,
): WorkspaceIdentity {
  if (platform?.role === 'platform_admin' && platform.active) {
    return { organization_id: '', role: 'platform_admin' };
  }
  if (workspace) return workspace;
  throw new Error('Účet nemá aktivní přístup do StavbaFlow.');
}
