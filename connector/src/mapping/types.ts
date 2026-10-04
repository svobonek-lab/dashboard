import type { CanonicalEntityType, CanonicalRecordV1 } from '../../../shared/connectorProtocol.js';

export type FieldConversion =
  | { kind: 'text' }
  | { kind: 'number' }
  | { kind: 'boolean'; invert?: boolean }
  | { kind: 'datetime' }
  | { kind: 'email' }
  | { kind: 'phone' }
  | { kind: 'currency'; decimalSeparator?: '.' | ',' }
  | { kind: 'enum'; values: Record<string, string> };

export interface FieldMappingRuleV1 {
  sourceColumn: string;
  targetField: string;
  conversion: FieldConversion;
  required?: boolean;
}

export interface EntityMappingV1 {
  version: 1;
  mappingVersion: number;
  entityType: CanonicalEntityType;
  sourceSystem: string;
  schema: string;
  table: string;
  externalIdColumn: string;
  updatedAtColumn?: string;
  deletedAtColumn?: string;
  fields: FieldMappingRuleV1[];
}

export type MappingIssueCode =
  | 'EXTERNAL_ID_MISSING'
  | 'REQUIRED_VALUE_MISSING'
  | 'CONVERSION_INVALID'
  | 'ENUM_VALUE_UNKNOWN';

export interface MappingIssue {
  sourceColumn: string;
  targetField?: string;
  code: MappingIssueCode;
}

export interface MappingResult {
  record: CanonicalRecordV1 | null;
  issues: MappingIssue[];
}

export interface CompiledMapping {
  readonly definition: EntityMappingV1;
  mapRow(row: Record<string, unknown>): MappingResult;
}
