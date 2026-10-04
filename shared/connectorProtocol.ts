export const CANONICAL_ENTITY_TYPES = [
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
  records: CanonicalRecordV1[];
}

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
  | 'rotate_identity';

export interface ConnectorCommandV1 {
  version: 1;
  id: string;
  connectorId: string;
  type: ConnectorCommandType;
  expiresAt: string;
  mappingVersion?: number;
}

export type ConnectorRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial_failure'
  | 'paused';

export const CANONICAL_PAYLOAD_FIELDS: Record<CanonicalEntityType, readonly string[]> = {
  customer: ['name', 'companyNumber', 'vatNumber', 'email', 'phone', 'address', 'city', 'postalCode', 'country', 'archived'],
  contact: ['firstName', 'lastName', 'name', 'email', 'phone', 'role', 'customerExternalId', 'archived'],
  lead: ['title', 'description', 'customerExternalId', 'contactExternalId', 'value', 'currency', 'status', 'priority', 'address', 'city', 'scheduledAt', 'archived'],
  project: ['title', 'description', 'customerExternalId', 'status', 'address', 'city', 'startsAt', 'endsAt', 'budget', 'currency', 'archived'],
  employee_directory: ['name', 'email', 'phone', 'role', 'active', 'archived'],
  invoice: ['number', 'customerExternalId', 'projectExternalId', 'issuedAt', 'dueAt', 'total', 'currency', 'status', 'paidAt', 'archived'],
  payment: ['invoiceExternalId', 'paidAt', 'amount', 'currency', 'method', 'reference', 'archived'],
  custom_record: ['namespace', 'fields', 'archived'],
};
