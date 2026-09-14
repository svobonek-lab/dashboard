import { FieldMappingConfig, TargetFieldType } from './integrations';
import { LeadFile } from './index';

export type SynologyConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

export type SynologyAuthMode = 'token' | 'credentials';

export type SynologyDbDriver = 'mariadb' | 'postgresql' | 'none';

export interface SynologySharedFolder {
  path: string;
  name: string;
  category: 'Zakazky' | 'Nabidky' | 'Realizace' | 'Fotky' | 'General';
  fileCount: number;
  totalSizeBytes: number;
  enabled: boolean;
  lastScanned?: string;
}

export interface SynologyDiscoveredFile {
  id: string;
  name: string;
  path: string;
  folderCategory: 'Zakazky' | 'Nabidky' | 'Realizace' | 'Fotky' | 'General';
  fileType: 'pdf' | 'photo' | 'excel' | 'doc' | 'other';
  sizeBytes: number;
  modifiedAt: string;
  matchedProjectId?: string;
  matchedProjectTitle?: string;
  matchedCustomerName?: string;
  previewUrl: string;
  isAttached: boolean;
}

export interface SynologyDatabaseConfig {
  driver: SynologyDbDriver;
  port: number;
  database: string;
  table: string;
  enabled: boolean;
  fieldMapping: FieldMappingConfig;
  discoveredTables: string[];
}

export interface SynologyConfig {
  id: string;
  organizationId: string;
  name: string;
  status: SynologyConnectionStatus;
  
  // Connection details
  nasAddress: string;
  port: number;
  useHttps: boolean;
  authMode: SynologyAuthMode;
  apiToken: string;
  username: string;
  passwordEncrypted: string;
  
  // NAS Hardware & DSM Info
  detectedModel: string;
  dsmVersion: string;
  serialNumberMasked: string;
  ipAddress: string;
  uptimeHours: number;
  cpuUsagePercent: number;
  ramUsagePercent: number;
  storageUsagePercent: number;
  
  // Services
  containerManagerInstalled: boolean;
  dockerConnectorRunning: boolean;
  connectorVersion: string;
  
  // Database sync
  databaseSync: SynologyDatabaseConfig;
  
  // Shared folders sync
  sharedFolders: SynologySharedFolder[];
  
  // Automation
  autoSync: boolean;
  syncIntervalMinutes: number; // default 5
  lastSync?: string;
  nextSync?: string;
  lastSyncStatus?: 'success' | 'error';
  lastSyncError?: string;
  
  // Metrics
  totalFilesSynced: number;
  totalProjectsSynced: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface SynologySyncResult {
  success: boolean;
  importedLeads: number;
  updatedLeads: number;
  syncedFilesCount: number;
  attachedPhotosCount: number;
  attachedDocumentsCount: number;
  durationMs: number;
  message: string;
  errors?: string[];
}
