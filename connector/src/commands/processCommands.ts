import type { ConnectorCommandV1, ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';

export interface ConnectorCommandActions {
  refreshMapping(definition: ConnectorMappingDefinitionV1): Promise<void>;
  approveMapping(mappingVersion: number): Promise<void>;
  syncNow(): Promise<void>;
  setPaused(paused: boolean): Promise<void>;
  acknowledge(commandId: string): Promise<void>;
}

function mappingVersion(command: ConnectorCommandV1): number {
  if (!Number.isInteger(command.mappingVersion) || Number(command.mappingVersion) < 1) throw new Error('mapping version is required');
  return Number(command.mappingVersion);
}

export async function processConnectorCommands(commands: ConnectorCommandV1[], actions: ConnectorCommandActions): Promise<void> {
  for (const command of commands) {
    switch (command.type) {
      case 'refresh_mapping': {
        const version = mappingVersion(command);
        if (!command.mappingDefinition || command.mappingDefinition.mappingVersion !== version) throw new Error('mapping definition is required');
        await actions.refreshMapping(command.mappingDefinition);
        break;
      }
      case 'approve_mapping':
        await actions.approveMapping(mappingVersion(command));
        break;
      case 'sync_now':
        await actions.syncNow();
        break;
      case 'pause':
        await actions.setPaused(true);
        break;
      case 'resume':
        await actions.setPaused(false);
        break;
      case 'rotate_identity':
        throw new Error('identity rotation requires an operator-assisted release');
    }
    await actions.acknowledge(command.id);
  }
}
