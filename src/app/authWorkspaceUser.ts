export interface ResolvedWorkspaceIdentity {
  organization_id: string;
  role: string;
}

export function toAuthenticatedWorkspaceUser<T extends { id: string }>(
  authUser: T,
  identity: ResolvedWorkspaceIdentity | null,
): T & ResolvedWorkspaceIdentity {
  if (!identity) {
    throw new Error('Účet nemá aktivní členství v žádné firmě.');
  }

  return {
    ...authUser,
    role: identity.role,
    organization_id: identity.organization_id,
  };
}
