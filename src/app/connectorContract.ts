export type ConnectorUiStatus = 'not_configured' | 'awaiting_enrollment' | 'mapping_required' | 'dry_run_required' | 'ready' | 'running' | 'success' | 'partial_failure' | 'paused' | 'outdated' | 'revoked';

export interface ConnectorSummary {
  id: string;
  status: ConnectorUiStatus;
  version: string | null;
  lastHeartbeatAt: string | null;
  mappingVersion: number | null;
}

export interface ConnectorMappingV1 {
  version: 1;
  mappingVersion: number;
  entityType: 'customer' | 'contact' | 'lead' | 'project' | 'employee_directory' | 'invoice' | 'payment' | 'custom_record';
  sourceSystem: string;
  schema: string;
  table: string;
  externalIdColumn: string;
  updatedAtColumn?: string;
  deletedAtColumn?: string;
  fields: Array<{ sourceColumn: string; targetField: string; conversion: { kind: string }; required?: boolean }>;
}

export interface EnrollmentResponse { connectorId: string; enrollmentCode: string; expiresAt: string }
