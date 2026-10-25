import type { ConnectorMappingDefinitionV1 } from '../../../../shared/connectorProtocol.js';

type EditableMapping = Omit<ConnectorMappingDefinitionV1, 'version'>;

export function buildConnectorMapping(input: EditableMapping): ConnectorMappingDefinitionV1 {
  const requiredTarget = input.entityType === 'company' ? 'name' : input.entityType === 'lead' ? 'title' : null;
  const fields = input.fields.filter(field => field.sourceColumn.trim());
  const targets = fields.map(field => field.targetField);
  if (!requiredTarget || !targets.some(target => target === requiredTarget) || new Set(targets).size !== targets.length) {
    throw new Error('BYODB_REQUIRED_FIELD_UNMAPPED');
  }
  return { ...input, version: 1, fields };
}
