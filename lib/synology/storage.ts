import { SynologyConfig, SynologyDiscoveredFile, SynologySharedFolder } from '@/types/synology';
import { IntegrationLog } from '@/types/integrations';
import { addOrganizationLog } from '../integrations/storage';

const SYNOLOGY_CONFIG_PREFIX = 'buildflow_synology_config_';
const SYNOLOGY_FILES_PREFIX = 'buildflow_synology_files_';

export const DEFAULT_SHARED_FOLDERS: SynologySharedFolder[] = [
  {
    path: '/volume1/Zakazky',
    name: 'Zakázky (Projektová dokumentace & Výkresy)',
    category: 'Zakazky',
    fileCount: 42,
    totalSizeBytes: 185000000, // ~185 MB
    enabled: true,
    lastScanned: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    path: '/volume1/Nabidky',
    name: 'Nabídky (Položkové rozpočty & PDF výstupy)',
    category: 'Nabidky',
    fileCount: 28,
    totalSizeBytes: 45000000, // ~45 MB
    enabled: true,
    lastScanned: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    path: '/volume1/Realizace',
    name: 'Realizace (Harmonogramy & Stavební protokoly)',
    category: 'Realizace',
    fileCount: 19,
    totalSizeBytes: 32000000,
    enabled: true,
    lastScanned: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    path: '/volume1/Fotky',
    name: 'Fotky (Stavební fotodokumentace & Zaměření)',
    category: 'Fotky',
    fileCount: 134,
    totalSizeBytes: 950000000, // ~950 MB
    enabled: true,
    lastScanned: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  }
];

export function getDefaultSynologyConfig(orgId: string): SynologyConfig {
  return {
    id: `synology-${orgId}`,
    organizationId: orgId,
    name: 'Firemní Synology NAS',
    status: 'disconnected',
    nasAddress: '192.168.1.200',
    port: 5001,
    useHttps: true,
    authMode: 'token',
    apiToken: '',
    username: 'buildflow-connector',
    passwordEncrypted: '',
    
    detectedModel: 'Synology DiskStation DS923+',
    dsmVersion: 'DSM 7.2.2-72806 Update 1',
    serialNumberMasked: '2290S***918A',
    ipAddress: '192.168.1.200',
    uptimeHours: 842,
    cpuUsagePercent: 12,
    ramUsagePercent: 28,
    storageUsagePercent: 44,
    
    containerManagerInstalled: true,
    dockerConnectorRunning: false,
    connectorVersion: 'v2.4.1',
    
    databaseSync: {
      driver: 'mariadb',
      port: 3306,
      database: 'firma_stavby',
      table: 'v_zakazky_nas',
      enabled: true,
      discoveredTables: ['v_zakazky_nas', 'poptavky_crm', 'stavebni_denik', 'sklad_material'],
      fieldMapping: {
        jmeno_zakaznika: 'customerName',
        nazev_projektu: 'title',
        rozpocet_kc: 'price',
        stav_zakazky: 'status',
        odpovedny_technik: 'assignedEmployeeName',
        telefon_klient: 'customerPhone',
        email_klient: 'customerEmail',
        mesto: 'city',
        ulice_cp: 'address',
        termin_zahajeni: 'preferredDate',
        technicka_poznamka: 'description'
      }
    },
    
    sharedFolders: DEFAULT_SHARED_FOLDERS,
    
    autoSync: true,
    syncIntervalMinutes: 5,
    totalFilesSynced: 0,
    totalProjectsSynced: 0,
    
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function getSynologyConfig(orgId: string): SynologyConfig {
  try {
    const raw = localStorage.getItem(`${SYNOLOGY_CONFIG_PREFIX}${orgId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load Synology config:', e);
  }
  return getDefaultSynologyConfig(orgId);
}

export function saveSynologyConfig(orgId: string, config: SynologyConfig): void {
  try {
    config.updatedAt = new Date().toISOString();
    localStorage.setItem(`${SYNOLOGY_CONFIG_PREFIX}${orgId}`, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save Synology config:', e);
  }
}

export function generateSynologyToken(orgId: string): string {
  const token = `syn_tok_${orgId.substring(0, 8)}_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
  return token;
}

export function getSynologyDiscoveredFiles(orgId: string): SynologyDiscoveredFile[] {
  try {
    const raw = localStorage.getItem(`${SYNOLOGY_FILES_PREFIX}${orgId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load Synology files:', e);
  }
  return [];
}

export function saveSynologyDiscoveredFiles(orgId: string, files: SynologyDiscoveredFile[]): void {
  try {
    localStorage.setItem(`${SYNOLOGY_FILES_PREFIX}${orgId}`, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save Synology files:', e);
  }
}
