export type ConnectorUiStatus =
  | 'not_configured'
  | 'awaiting_enrollment'
  | 'mapping_required'
  | 'dry_run_required'
  | 'ready'
  | 'running'
  | 'success'
  | 'partial_failure'
  | 'paused'
  | 'outdated'
  | 'revoked';

export interface ConnectorSourceColumn {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface ConnectorSourceTable {
  schema: string;
  name: string;
  columns: ConnectorSourceColumn[];
}

export interface ConnectorSourceSchema {
  tables: ConnectorSourceTable[];
}

export interface ConnectorDryRunSummary {
  completedAt: string;
  total: number;
  valid: number;
  failed: number;
  issues: Array<{ code: string; sourceColumn: string; targetField?: string }>;
  approvedAt: string | null;
}

export interface ConnectorSummary {
  id: string;
  status: ConnectorUiStatus;
  version: string | null;
  lastHeartbeatAt: string | null;
  nextSyncAt: string | null;
  mappingVersion: number | null;
  approvedMappingVersion: number | null;
  sourceSchema: ConnectorSourceSchema | null;
  dryRun: ConnectorDryRunSummary | null;
  lastRun: { completedAt: string; processed: number; changed: number; failed: number } | null;
  pauseReason: string | null;
}

export interface ConnectorMappingV1 {
  version: 1;
  mappingVersion: number;
  entityType: 'company' | 'customer' | 'contact' | 'lead' | 'project' | 'employee_directory' | 'invoice' | 'payment' | 'custom_record';
  sourceSystem: string;
  schema: string;
  table: string;
  externalIdColumn: string;
  updatedAtColumn?: string;
  deletedAtColumn?: string;
  fields: Array<{ sourceColumn: string; targetField: string; conversion: { kind: string }; required?: boolean }>;
}

export type { ByodbMappingDefinitionV1, ConnectorDatabaseDriverV1, ConnectorDatabaseModeConfigV1 } from '../../../../shared/connectorProtocol.js';

export interface EnrollmentResponse { enrollmentId: string; enrollmentCode: string; connectorSecret: string; expiresAt: string }
