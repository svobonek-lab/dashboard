export const CANONICAL_ENTITY_TYPES = [
  'company',
  'customer',
  'contact',
  'lead',
  'project',
  'employee_directory',
  'invoice',
  'payment',
  'custom_record',
] as const;

export type CanonicalEntityType = typeof CANONICAL_ENTITY_TYPES[number];
export type ConnectorDatabaseDriverV1 = 'postgres' | 'mysql' | 'mariadb' | 'mssql';
export type ConnectorDatabaseModeV1 = 'managed_cloud' | 'byodb';

export interface ConnectorDatabaseModeConfigV1 {
  version: 1;
  mode: ConnectorDatabaseModeV1;
  driver?: ConnectorDatabaseDriverV1;
}
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface CanonicalRecordV1 {
  version: 1;
  type: CanonicalEntityType;
  sourceSystem: string;
  sourceTable: string;
  externalId: string;
  sourceUpdatedAt?: string;
  fingerprint: string;
  payload: Record<string, JsonValue>;
}

export interface IngestEnvelopeV1 {
  version: 1;
  connectorId: string;
  companyId: string;
  mappingVersion: number;
  requestId: string;
  dryRun: boolean;
  dryRunSummary?: ConnectorDryRunSummaryV1;
  records: CanonicalRecordV1[];
}

export interface ConnectorDryRunIssueV1 {
  code: 'EXTERNAL_ID_MISSING' | 'REQUIRED_VALUE_MISSING' | 'CONVERSION_INVALID' | 'ENUM_VALUE_UNKNOWN';
  sourceColumn: string;
  targetField?: string;
}

export interface ConnectorDryRunSummaryV1 {
  total: number;
  valid: number;
  failed: number;
  issues: ConnectorDryRunIssueV1[];
}

export interface ConnectorSourceColumnV1 {
  name: string;
  dataType: string;
  nullable: boolean;
}

export interface ConnectorSourceTableV1 {
  schema: string;
  name: string;
  columns: ConnectorSourceColumnV1[];
}

export interface ConnectorSourceSchemaV1 {
  tables: ConnectorSourceTableV1[];
}

export type ConnectorFieldConversionV1 =
  | { kind: 'text' }
  | { kind: 'number' }
  | { kind: 'boolean'; invert?: boolean }
  | { kind: 'datetime' }
  | { kind: 'email' }
  | { kind: 'phone' }
  | { kind: 'currency'; decimalSeparator?: '.' | ',' }
  | { kind: 'enum'; values: Record<string, string> };

export interface ConnectorFieldMappingRuleV1 {
  sourceColumn: string;
  targetField: string;
  conversion: ConnectorFieldConversionV1;
  required?: boolean;
}

export interface ConnectorMappingDefinitionV1 {
  version: 1;
  mappingVersion: number;
  entityType: CanonicalEntityType;
  sourceSystem: string;
  schema: string;
  table: string;
  externalIdColumn: string;
  updatedAtColumn?: string;
  deletedAtColumn?: string;
  fields: ConnectorFieldMappingRuleV1[];
}

export type ByodbMappingDefinitionV1 = Omit<ConnectorMappingDefinitionV1, 'entityType'> & {
  entityType: 'company' | 'lead';
};

export interface IngestRecordResultV1 {
  externalId: string;
  type: CanonicalEntityType;
  status: 'created' | 'updated' | 'unchanged' | 'archived' | 'rejected';
  errorCode?: string;
  field?: string;
}

export interface IngestAckV1 {
  version: 1;
  requestId: string;
  accepted: boolean;
  results: IngestRecordResultV1[];
}

export type ConnectorCommandType =
  | 'sync_now'
  | 'pause'
  | 'resume'
  | 'refresh_mapping'
  | 'approve_mapping'
  | 'rotate_identity';

export interface ConnectorCommandV1 {
  version: 1;
  id: string;
  connectorId: string;
  type: ConnectorCommandType;
  expiresAt: string;
  mappingVersion?: number;
  mappingDefinition?: ConnectorMappingDefinitionV1;
}

export type ConnectorRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial_failure'
  | 'paused';

export const CANONICAL_PAYLOAD_FIELDS: Record<CanonicalEntityType, readonly string[]> = {
  company: ['name', 'companyNumber', 'vatNumber', 'email', 'phone', 'address', 'city', 'postalCode', 'country', 'archived'],
  customer: ['name', 'companyNumber', 'vatNumber', 'email', 'phone', 'address', 'city', 'postalCode', 'country', 'archived'],
  contact: ['firstName', 'lastName', 'name', 'email', 'phone', 'role', 'customerExternalId', 'archived'],
  lead: ['title', 'description', 'email', 'customerExternalId', 'contactExternalId', 'value', 'currency', 'status', 'priority', 'address', 'city', 'scheduledAt', 'archived'],
  project: ['title', 'description', 'customerExternalId', 'status', 'address', 'city', 'startsAt', 'endsAt', 'budget', 'currency', 'archived'],
  employee_directory: ['name', 'email', 'phone', 'role', 'active', 'archived'],
  invoice: ['number', 'customerExternalId', 'projectExternalId', 'issuedAt', 'dueAt', 'total', 'currency', 'status', 'paidAt', 'archived'],
  payment: ['invoiceExternalId', 'paidAt', 'amount', 'currency', 'method', 'reference', 'archived'],
  custom_record: ['namespace', 'fields', 'archived'],
};
