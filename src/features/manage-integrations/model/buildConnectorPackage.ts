import JSZip from 'jszip';

export type ConnectorPackageDriver = 'postgres' | 'mysql' | 'mariadb' | 'mssql';

export interface ConnectorPackageOptions {
  image: string;
  driver: ConnectorPackageDriver;
  apiBaseUrl: string;
}

const IMMUTABLE_IMAGE = /^ghcr\.io\/svobonek-lab\/stavbaflow-connector@sha256:[a-f0-9]{64}$/;

export function buildSynologyCompose(image: string): string {
  if (!IMMUTABLE_IMAGE.test(image)) throw new Error('CONNECTOR_IMAGE_DIGEST_REQUIRED');
  return `name: stavbaflow-connector
services:
  connector:
    image: ${image}
    restart: unless-stopped
    read_only: true
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    environment:
      STAVBAFLOW_CONNECTOR_CONFIG: /etc/stavbaflow/config.json
      DB_HOST: \u0024{DB_HOST:?Set the NAS-reachable database host}
      DB_PORT: \u0024{DB_PORT:?Set the database port}
    volumes:
      - /volume1/docker/stavbaflow/config:/etc/stavbaflow:ro
      - /volume1/docker/stavbaflow/state:/var/lib/stavbaflow:rw
    secrets: [source_db_password, source_db_write_password, connector_identity, enrollment_code]
    tmpfs: [/tmp:size=16m,mode=1777]
    healthcheck:
      test: [CMD, node, -e, "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      start_period: 20s
      retries: 3
    pids_limit: 128
    mem_limit: 512m
secrets:
  source_db_password:
    file: /volume1/docker/stavbaflow/secrets/source-db-password
  source_db_write_password:
    file: /volume1/docker/stavbaflow/secrets/source-db-write-password
  connector_identity:
    file: /volume1/docker/stavbaflow/secrets/connector-identity
  enrollment_code:
    file: /volume1/docker/stavbaflow/secrets/enrollment-code
`;
}

export async function buildConnectorPackage(options: ConnectorPackageOptions): Promise<Uint8Array> {
  const compose = buildSynologyCompose(options.image);
  if (!['postgres', 'mysql', 'mariadb', 'mssql'].includes(options.driver)) throw new Error('CONNECTOR_DRIVER_INVALID');
  let apiUrl: URL;
  try { apiUrl = new URL(options.apiBaseUrl); } catch { throw new Error('CONNECTOR_API_URL_INVALID'); }
  if (apiUrl.protocol !== 'https:' || apiUrl.username || apiUrl.password || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
    throw new Error('CONNECTOR_API_URL_INVALID');
  }
  const archive = new JSZip();
  archive.file('docker-compose.synology.yml', compose);
  archive.file('config.json', JSON.stringify({
    apiBaseUrl: options.apiBaseUrl,
    stateRoot: '/var/lib/stavbaflow',
    identityPath: '/run/secrets/connector_identity',
    enrollmentCodeFile: '/run/secrets/enrollment_code',
    mappingPath: '/var/lib/stavbaflow/mapping.json',
    syncIntervalSeconds: 300,
    database: {
      driver: options.driver,
      host: 'REPLACE_WITH_NAS_REACHABLE_HOST',
      port: options.driver === 'mssql' ? 1433 : options.driver === 'postgres' ? 5432 : 3306,
      database: 'REPLACE_WITH_DATABASE_NAME',
      username: 'REPLACE_WITH_SELECT_ONLY_USER',
      passwordFile: '/run/secrets/source_db_password',
      writeUsername: 'REPLACE_WITH_MAPPED_WRITE_USER',
      writePasswordFile: '/run/secrets/source_db_write_password',
      ssl: true,
    },
  }, null, 2) + '\n');
  return new Uint8Array(await archive.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}
