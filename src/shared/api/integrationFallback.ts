import type { SQLTestResult } from '../model/sqlConnector';

export function unsupportedSqlConnection(): SQLTestResult {
  return {
    success: false,
    latencyMs: 0,
    message: 'Přímé SQL připojení zatím není aktivní. Použijte bezpečný CSV/API import v režimu dry-run.',
    foundProjectsCount: 0,
    tablesCount: 0,
    recordsCount: 0,
    availableTables: [],
    sampleColumns: [],
    sampleRows: [],
    connectedStatus: 'disconnected',
    testedAt: new Date().toISOString(),
  };
}
