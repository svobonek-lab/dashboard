export type IntegrationType = 
  | 'sql' 
  | 'google_sheets' 
  | 'csv' 
  | 'rest_api' 
  | 'pohoda' 
  | 'raynet' 
  | 'helios';

export type IntegrationStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

export type SQLDriver = 'postgresql' | 'mysql' | 'mssql' | 'mariadb';

export type SSLMode = 'disable' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';

export interface SQLConnectionConfig {
  driver: SQLDriver;
  host: string;
  port: number;
  database: string;
  username: string;
  passwordEncrypted: string;
  ssl: SSLMode;
  tableNameOrQuery?: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
}

export interface GoogleSheetsConfig {
  spreadsheetUrlOrId: string;
  sheetName: string;
  apiKey?: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  headerRowIndex?: number;
}

export interface RestApiConfig {
  webhookSecret: string;
  webhookUrl: string;
  apiKey: string;
  autoSyncLeads: boolean;
  allowedIps?: string[];
}

export type TargetFieldType = 
  | 'customerName'
  | 'title'
  | 'price'
  | 'assignedEmployeeName'
  | 'status'
  | 'customerPhone'
  | 'customerEmail'
  | 'city'
  | 'address'
  | 'preferredDate'
  | 'description'
  | 'priority'
  | 'ignore';

export interface FieldMappingRule {
  sourceColumn: string;
  targetField: TargetFieldType;
  confidence?: number;
  sampleValue?: string;
  isAutoDetected?: boolean;
}

export type FieldMappingConfig = Record<string, TargetFieldType>;

export interface IntegrationLog {
  id: string;
  organizationId: string;
  integrationType: IntegrationType;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  timestamp: string;
  recordsProcessed?: number;
  durationMs?: number;
}

export interface IntegrationConfig {
  id: string;
  organizationId: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  lastSync?: string;
  nextSync?: string;
  lastSyncStatus?: 'success' | 'error';
  lastSyncError?: string;
  recordsCount: number;
  sqlConfig?: SQLConnectionConfig;
  sheetsConfig?: GoogleSheetsConfig;
  restConfig?: RestApiConfig;
  fieldMapping?: FieldMappingConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  success: boolean;
  importedLeads: number;
  updatedLeads: number;
  skippedDuplicates: number;
  importedEmployees: number;
  durationMs: number;
  message: string;
  errors?: string[];
}
