import { IntegrationConfig, IntegrationLog, IntegrationType } from '@/types/integrations';
import { DEFAULT_DEMO_ORG_ID } from '../supabase';

const STORAGE_KEY_CONFIGS = 'buildflow_integrations_configs';
const STORAGE_KEY_LOGS = 'buildflow_integrations_logs';

/**
 * Default starter templates for demo organization
 */
function getDefaultConfigs(orgId: string): IntegrationConfig[] {
  const isDefaultDemo = orgId === DEFAULT_DEMO_ORG_ID;

  return [
    {
      id: `int-sql-${orgId}`,
      organizationId: orgId,
      type: 'sql',
      name: 'Výrobní SQL Server (PostgreSQL)',
      status: isDefaultDemo ? 'connected' : 'disconnected',
      lastSync: isDefaultDemo ? new Date(Date.now() - 1000 * 60 * 12).toISOString() : undefined,
      nextSync: isDefaultDemo ? new Date(Date.now() + 1000 * 60 * 48).toISOString() : undefined,
      lastSyncStatus: isDefaultDemo ? 'success' : undefined,
      recordsCount: isDefaultDemo ? 4 : 0,
      sqlConfig: {
        driver: 'postgresql',
        host: isDefaultDemo ? 'db.pergoly-praha-internal.cz' : '',
        port: 5432,
        database: isDefaultDemo ? 'vyroba_stavby' : '',
        username: isDefaultDemo ? 'buildflow_readonly' : '',
        passwordEncrypted: '••••••••••••',
        ssl: 'require',
        tableNameOrQuery: 'v_zakazky_crm',
        autoSync: true,
        syncIntervalMinutes: 60
      },
      fieldMapping: {
        nazev_projektu: 'title',
        zakaznik_jmeno: 'customerName',
        telefon: 'customerPhone',
        email: 'customerEmail',
        cena_smluvni: 'price',
        stav: 'status',
        odpovedny_technik: 'assignedEmployeeName',
        mesto: 'city',
        adresa_stavby: 'address',
        termin_zahajeni: 'preferredDate',
        poznamka: 'description'
      },
      createdAt: new Date('2026-02-01').toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `int-sheets-${orgId}`,
      organizationId: orgId,
      type: 'google_sheets',
      name: 'Google Sheets – Tabulka Montáží 2026',
      status: isDefaultDemo ? 'connected' : 'disconnected',
      lastSync: isDefaultDemo ? new Date(Date.now() - 1000 * 60 * 35).toISOString() : undefined,
      nextSync: isDefaultDemo ? new Date(Date.now() + 1000 * 60 * 25).toISOString() : undefined,
      lastSyncStatus: isDefaultDemo ? 'success' : undefined,
      recordsCount: isDefaultDemo ? 3 : 0,
      sheetsConfig: {
        spreadsheetUrlOrId: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
        sheetName: 'Poptávky 2026',
        autoSync: true,
        syncIntervalMinutes: 30
      },
      fieldMapping: {
        'Číslo zakázky': 'ignore',
        'Klient / Objednatel': 'customerName',
        'Typ projektu': 'title',
        'Telefon': 'customerPhone',
        'E-mail': 'customerEmail',
        'Město': 'city',
        'Adresa': 'address',
        'Předpokládaná cena': 'price',
        'Stav': 'status',
        'Montážník / Mistr': 'assignedEmployeeName',
        'Termín montáže': 'preferredDate',
        'Poznámka ke stavbě': 'description'
      },
      createdAt: new Date('2026-02-15').toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `int-csv-${orgId}`,
      organizationId: orgId,
      type: 'csv',
      name: 'Excel / CSV Import Studio',
      status: isDefaultDemo ? 'connected' : 'disconnected',
      lastSync: isDefaultDemo ? new Date(Date.now() - 1000 * 60 * 180).toISOString() : undefined,
      lastSyncStatus: isDefaultDemo ? 'success' : undefined,
      recordsCount: isDefaultDemo ? 12 : 0,
      createdAt: new Date('2026-01-10').toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `int-rest-${orgId}`,
      organizationId: orgId,
      type: 'rest_api',
      name: 'REST API & Inbound Webhook Listener',
      status: 'disconnected',
      recordsCount: 0,
      createdAt: new Date('2026-01-01').toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `int-pohoda-${orgId}`,
      organizationId: orgId,
      type: 'pohoda',
      name: 'Stormware POHODA (mServer & XML)',
      status: 'disconnected',
      recordsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `int-raynet-${orgId}`,
      organizationId: orgId,
      type: 'raynet',
      name: 'RAYNET CRM Connector',
      status: 'disconnected',
      recordsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: `int-helios-${orgId}`,
      organizationId: orgId,
      type: 'helios',
      name: 'Asseco HELIOS (Orange / Nephrite)',
      status: 'disconnected',
      recordsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

/**
 * Retrieves all integration configs for a specific organization
 */
export function getOrganizationIntegrations(organizationId: string): IntegrationConfig[] {
  if (!organizationId) return [];

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_CONFIGS}_${organizationId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as IntegrationConfig[];
      return parsed.map((config) => {
        const restConfig = config.type === 'rest_api' ? config.restConfig : undefined;
        const isGeneratedFallback = Boolean(
          restConfig?.webhookUrl?.includes('api.buildflow.app/v1/webhooks/inbound/') &&
          restConfig?.apiKey?.startsWith('bf_live_')
        );

        if (!isGeneratedFallback) return config;

        return {
          ...config,
          status: 'disconnected' as const,
          lastSync: undefined,
          lastSyncStatus: undefined,
          recordsCount: 0,
          restConfig: undefined
        };
      });
    }
  } catch (e) {
    console.warn('Failed to read integrations from localStorage', e);
  }

  const defaults = getDefaultConfigs(organizationId);
  saveOrganizationIntegrations(organizationId, defaults);
  return defaults;
}

/**
 * Saves all integration configs for a specific organization
 */
export function saveOrganizationIntegrations(organizationId: string, configs: IntegrationConfig[]): void {
  if (!organizationId) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_CONFIGS}_${organizationId}`, JSON.stringify(configs));
  } catch (e) {
    console.warn('Failed to save integrations to localStorage', e);
  }
}

/**
 * Updates a single integration config
 */
export function updateIntegrationConfig(
  organizationId: string, 
  integrationId: string, 
  updates: Partial<IntegrationConfig>
): IntegrationConfig {
  const configs = getOrganizationIntegrations(organizationId);
  const index = configs.findIndex(c => c.id === integrationId || c.type === updates.type);

  if (index !== -1) {
    configs[index] = {
      ...configs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveOrganizationIntegrations(organizationId, configs);
    return configs[index];
  } else {
    const newConfig: IntegrationConfig = {
      id: integrationId || `int-${Date.now()}`,
      organizationId,
      type: updates.type || 'sql',
      name: updates.name || 'Nová integrace',
      status: updates.status || 'connected',
      recordsCount: updates.recordsCount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...updates
    };
    configs.push(newConfig);
    saveOrganizationIntegrations(organizationId, configs);
    return newConfig;
  }
}

/**
 * Integration telemetry logs storage
 */
export function getOrganizationLogs(organizationId: string): IntegrationLog[] {
  if (!organizationId) return [];

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_LOGS}_${organizationId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read integration logs', e);
  }

  // Initial seed logs for demo org
  const initialLogs: IntegrationLog[] = [
    {
      id: 'log-1',
      organizationId,
      integrationType: 'sql',
      level: 'success',
      message: 'SQL Synchronizace dokončena: 4 zakázky úspěšně načteny a ověřeny.',
      details: 'PostgreSQL Server latency 48ms. 0 duplicit nalezeno.',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      recordsProcessed: 4,
      durationMs: 480
    },
    {
      id: 'log-2',
      organizationId,
      integrationType: 'google_sheets',
      level: 'success',
      message: 'Google Sheets automatický sync proběhl bez chyb (List "Poptávky 2026").',
      details: '3 nové záznamy promítnuty do CRM Kanbanu.',
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      recordsProcessed: 3,
      durationMs: 310
    },
    {
      id: 'log-3',
      organizationId,
      integrationType: 'rest_api',
      level: 'info',
      message: 'Inbound Webhook listener inicializován na zabezpečeném HTTPS endpointu.',
      details: 'Připraveno pro příjem REST payloadů z libovolného webu nebo kalkulátoru.',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    }
  ];

  saveOrganizationLogs(organizationId, initialLogs);
  return initialLogs;
}

export function saveOrganizationLogs(organizationId: string, logs: IntegrationLog[]): void {
  if (!organizationId) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_LOGS}_${organizationId}`, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.warn('Failed to save integration logs', e);
  }
}

export function addOrganizationLog(
  organizationId: string, 
  log: Omit<IntegrationLog, 'id' | 'timestamp' | 'organizationId'>
): IntegrationLog {
  const logs = getOrganizationLogs(organizationId);
  const newLog: IntegrationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    organizationId,
    ...log
  };
  logs.unshift(newLog);
  saveOrganizationLogs(organizationId, logs);
  return newLog;
}
