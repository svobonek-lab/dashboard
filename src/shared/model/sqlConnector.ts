export interface SQLTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  foundProjectsCount: number;
  tablesCount: number;
  recordsCount: number;
  availableTables: string[];
  sampleColumns: string[];
  sampleRows: Record<string, any>[];
  serverVersion?: string;
  connectedStatus?: 'connected' | 'disconnected' | 'error';
  testedAt?: string;
}
