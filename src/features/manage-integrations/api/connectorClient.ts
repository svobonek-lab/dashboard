import { supabase } from '@/shared/api/supabase';
import type { ConnectorMappingV1, ConnectorSummary, EnrollmentResponse } from './connectorContract';

async function request<T>(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new Error('Před správou napojení se znovu přihlaste.');
  const response = await fetch(path, { method: 'POST', signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result?.code === 'string' ? result.code : 'CONNECTOR_REQUEST_FAILED');
  return result as T;
}

export const connectorClient = {
  createEnrollment: (companyId: string, signal?: AbortSignal) => request<EnrollmentResponse>('/api/connector/enroll', { action: 'create', companyId }, signal),
  status: (companyId: string, signal?: AbortSignal) => request<{ connectors: ConnectorSummary[] }>('/api/connector/status', { companyId }, signal),
  saveMapping: (companyId: string, connectorId: string, mapping: ConnectorMappingV1, signal?: AbortSignal) => request<{ mappingVersion: number }>('/api/connector/mapping', { companyId, connectorId, mapping }, signal),
  approveMapping: (companyId: string, connectorId: string, mappingVersion: number, signal?: AbortSignal) => request<{ accepted: boolean }>('/api/connector/command', { companyId, connectorId, command: 'approve_mapping', mappingVersion }, signal),
  command: (companyId: string, connectorId: string, command: string, signal?: AbortSignal) => request<{ accepted: boolean }>('/api/connector/command', { companyId, connectorId, command }, signal),
  databaseMode: (companyId: string, signal?: AbortSignal) => request<{ mode: 'managed_cloud' | 'byodb'; driver: string | null; connectorId: string | null; writeEnabled: boolean }>('/api/connector/operations', { action: 'context', companyId }, signal),
  setDatabaseMode: (companyId: string, connectorId: string | null, mode: 'managed_cloud' | 'byodb', driver: 'postgres' | 'mysql' | 'mariadb' | 'mssql' | null, writeEnabled: boolean) => request<{ accepted: boolean }>('/api/connector/operations', { action: 'set_mode', companyId, connectorId, mode, driver, writeEnabled }),
  operations: (companyId: string, signal?: AbortSignal) => request<{ operations: Array<{ operationId: string; status: string; entityType: string; action: string; createdAt: string; updatedAt: string; errorCode: string | null }> }>('/api/connector/operations', { action: 'list', companyId, limit: 50 }, signal),
};
