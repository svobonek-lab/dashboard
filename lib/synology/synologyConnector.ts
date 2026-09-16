import { SynologyConfig, SynologyDatabaseConfig, SynologyDiscoveredFile } from '@/types/synology';

export interface SynologyConnectionTestResult {
  success: boolean;
  model: string;
  dsmVersion: string;
  serialNumberMasked: string;
  latencyMs: number;
  uptimeHours: number;
  cpuUsagePercent: number;
  ramUsagePercent: number;
  storageUsagePercent: number;
  containerManagerInstalled: boolean;
  discoveredDatabases: string[];
  discoveredSharedFolders: string[];
  errorMessage?: string;
}

export async function testSynologyConnection(
  nasAddress: string,
  port: number,
  useHttps: boolean,
  authMode: 'token' | 'credentials',
  tokenOrPassword: string,
  username?: string
): Promise<SynologyConnectionTestResult> {
  // Simulate network latency (250-450ms)
  await new Promise(resolve => setTimeout(resolve, 380));

  const cleanAddress = nasAddress.trim();
  if (!cleanAddress) {
    return {
      success: false,
      model: '',
      dsmVersion: '',
      serialNumberMasked: '',
      latencyMs: 0,
      uptimeHours: 0,
      cpuUsagePercent: 0,
      ramUsagePercent: 0,
      storageUsagePercent: 0,
      containerManagerInstalled: false,
      discoveredDatabases: [],
      discoveredSharedFolders: [],
      errorMessage: 'Vyplňte prosím platnou IP adresu nebo hostname Synology NAS.'
    };
  }

  // Model detection based on hostname / address heuristics
  let detectedModel = 'Synology DiskStation DS923+';
  let dsmVer = 'DSM 7.2.2-72806 Update 1';

  if (cleanAddress.toLowerCase().includes('rs') || cleanAddress.includes('rack')) {
    detectedModel = 'Synology RackStation RS2423+ (8-Core Ryzen, 16GB ECC)';
    dsmVer = 'DSM 7.2.2-72806 Enterprise';
  } else if (cleanAddress.toLowerCase().includes('1621') || cleanAddress.includes('6bay')) {
    detectedModel = 'Synology DiskStation DS1621+ (AMD Ryzen V1500B)';
  } else if (cleanAddress.toLowerCase().includes('220') || cleanAddress.includes('224')) {
    detectedModel = 'Synology DiskStation DS224+ (Intel Celeron J4125)';
  }

  return {
    success: true,
    model: detectedModel,
    dsmVersion: dsmVer,
    serialNumberMasked: '2290S***918A',
    latencyMs: Math.floor(18 + Math.random() * 15),
    uptimeHours: Math.floor(400 + Math.random() * 600),
    cpuUsagePercent: Math.floor(8 + Math.random() * 14),
    ramUsagePercent: Math.floor(24 + Math.random() * 12),
    storageUsagePercent: 44,
    containerManagerInstalled: true,
    discoveredDatabases: ['firma_stavby', 'synology_mariadb10', 'postgres_crm', 'sklad_evidence'],
    discoveredSharedFolders: ['/volume1/Zakazky', '/volume1/Nabidky', '/volume1/Realizace', '/volume1/Fotky', '/volume1/Zalohy']
  };
}

export function generateSynologyDockerCompose(config: SynologyConfig, organizationId: string): string {
  const token = config.apiToken || 'buildflow-syn-token-replace-me';
  const nasHost = config.nasAddress || 'localhost';
  const nasPort = config.port || (config.useHttps ? 5001 : 5000);
  const endpointProtocol = config.useHttps ? 'https' : 'http';

  return `# ====================================================================
# BuildFlow Enterprise Synology Connector (Docker Compose)
# Architektura: Synology Container Manager (DSM 7.x)
# Moduly: [SQL] [Files] [HTTPS] [API Token]
# Organizace: ${organizationId}
# ====================================================================

version: '3.8'

services:
  buildflow-connector:
    image: ghcr.io/buildflow-os/synology-connector:${config.connectorVersion || 'latest'}
    container_name: buildflow_nas_connector
    restart: always
    network_mode: bridge
    environment:
      # ------------------------------------------------------------------
      # 1. AUTENTIZACE & API TOKEN
      # ------------------------------------------------------------------
      - BUILDFLOW_ORG_ID=${organizationId}
      - BUILDFLOW_API_TOKEN=${token}
      - BUILDFLOW_AUTH_SCHEME=Bearer
      
      # ------------------------------------------------------------------
      # 2. ZABEZPEČENÝ TRANSPORT (HTTPS & TLS 1.3)
      # ------------------------------------------------------------------
      - BUILDFLOW_ENDPOINT=https://ais-dev-yafu5oubxe3o6hzzewfzd2-440069837434.europe-west2.run.app/api/v1/synology/webhook/${organizationId}
      - HTTPS_STRICT_TLS=true
      - TLS_MIN_VERSION=TLSv1.3
      - SSL_VERIFY=true
      - ENCRYPTION_CIPHER=AES-256-GCM
      - SYNC_INTERVAL_SECONDS=300

      # ------------------------------------------------------------------
      # 3. LOKÁLNÍ DATABÁZE (SQL - MariaDB 10 / PostgreSQL)
      # ------------------------------------------------------------------
      - DB_ENABLED=${config.databaseSync.enabled ? 'true' : 'false'}
      - DB_DRIVER=${config.databaseSync.driver}
      - DB_HOST=host.docker.internal
      - DB_PORT=${config.databaseSync.port}
      - DB_NAME=${config.databaseSync.database}
      - DB_TABLE=${config.databaseSync.table}
      - DB_USER=buildflow_ro
      - DB_PASSWORD_ENV=DB_PASSWORD_SECRET
      - DB_QUERY_TIMEOUT_MS=15000
      - DB_SSL_MODE=prefer

      # ------------------------------------------------------------------
      # 4. SOUBOROVÝ SYSTÉM (FILES - Inotify Watcher & Shared Folders)
      # ------------------------------------------------------------------
      - FILES_WATCHER_ENABLED=true
      - WATCH_ZAKAZKY_DIR=/data/zakazky
      - WATCH_NABIDKY_DIR=/data/nabidky
      - WATCH_REALIZACE_DIR=/data/realizace
      - WATCH_FOTKY_DIR=/data/fotky
      - MAX_FILE_SIZE_MB=50
      - ALLOWED_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.dwg
      - SEND_ONLY_METADATA=false

    volumes:
      # Mapování svazků Synology DSM (Bezpečný režim Read-Only pro data)
      - /volume1/Zakazky:/data/zakazky:ro
      - /volume1/Nabidky:/data/nabidky:ro
      - /volume1/Realizace:/data/realizace:ro
      - /volume1/Fotky:/data/fotky:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro

    extra_hosts:
      # Přístup k hostitelskému NAS portu (pro lokální MariaDB/PostgreSQL)
      - "host.docker.internal:host-gateway"

    healthcheck:
      test: ["CMD", "curl", "-f", "-H", "Authorization: Bearer \${BUILDFLOW_API_TOKEN}", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
`;
}

export function getMockSynologyDatabaseRows(): Record<string, any>[] {
  return [
    {
      id_zakazky: 'NAS-2026-081',
      jmeno_zakaznika: 'Ing. Pavel Dvořák',
      nazev_projektu: 'Hliníková pergola 6x4m s bioklimatickými lamelami & LED',
      rozpocet_kc: 345000,
      stav_zakazky: 'In Progress',
      odpovedny_technik: 'Karel Novák',
      telefon_klient: '+420 777 819 230',
      email_klient: 'dvorak.pavel@arch-atelier.cz',
      mesto: 'Brno - Ivanovice',
      ulice_cp: 'Ječná 42',
      termin_zahajeni: '2026-09-22',
      technicka_poznamka: 'Kotvení do zateplené fasády 200mm EPS, integrované screenové rolety Somfy.'
    },
    {
      id_zakazky: 'NAS-2026-082',
      jmeno_zakaznika: 'MUDr. Klára Svobodová',
      nazev_projektu: 'Zimní zahrada SeasonLux s posuvným trojsklem',
      rozpocet_kc: 580000,
      stav_zakazky: 'Quote',
      odpovedny_technik: 'Tomáš Dvořák',
      telefon_klient: '+420 608 342 119',
      email_klient: 'klara.svoboda@fnusa.cz',
      mesto: 'Kuřim',
      ulice_cp: 'Bezručova 18',
      termin_zahajeni: '2026-10-05',
      technicka_poznamka: 'Požadavek na podlahové vytápění a napojení na chytrou domácnost Loxone.'
    },
    {
      id_zakazky: 'NAS-2026-083',
      jmeno_zakaznika: 'Radim Procházka',
      nazev_projektu: 'Stínění terasy & Screenové rolety na rodinném domě',
      rozpocet_kc: 165000,
      stav_zakazky: 'New',
      odpovedny_technik: 'Marek Kučera',
      telefon_klient: '+420 739 120 445',
      email_klient: 'radim.prochazka@seznam.cz',
      mesto: 'Slavkov u Brna',
      ulice_cp: 'Československé armády 512',
      termin_zahajeni: '2026-09-28',
      technicka_poznamka: 'Solární napájení motorů Somfy Solar io.'
    },
    {
      id_zakazky: 'NAS-2026-084',
      jmeno_zakaznika: 'Vinařství Pavlov s.r.o. (Mgr. Jančík)',
      nazev_projektu: 'Komerční zastřešení degustační terasy 12x5m',
      rozpocet_kc: 890000,
      stav_zakazky: 'Contacted',
      odpovedny_technik: 'Karel Novák',
      telefon_klient: '+420 724 991 302',
      email_klient: 'jancik@vinarstvi-pavlov.cz',
      mesto: 'Pavlov',
      ulice_cp: 'Vinařská 88',
      termin_zahajeni: '2026-10-15',
      technicka_poznamka: 'Zesílená konstrukce pro zátěž větrem v Pálavské oblasti.'
    }
  ];
}
