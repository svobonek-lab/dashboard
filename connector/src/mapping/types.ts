import type {
  CanonicalRecordV1,
  ConnectorFieldConversionV1,
  ConnectorFieldMappingRuleV1,
  ConnectorMappingDefinitionV1,
} from '../../../shared/connectorProtocol.js';

export type FieldConversion = ConnectorFieldConversionV1;
export type FieldMappingRuleV1 = ConnectorFieldMappingRuleV1;
export type EntityMappingV1 = ConnectorMappingDefinitionV1;

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
