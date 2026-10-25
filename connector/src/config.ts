import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import type { SourceAdapterConfig, SourceDriver } from './adapters/types.js';

interface ConfigDatabaseInput {
  driver: SourceDriver;
  host: string;
  port: number;
  database: string;
  username: string;
  passwordFile: string;
  writeUsername?: string;
  writePasswordFile?: string;
  schema?: string;
  ssl?: boolean;
}

export interface ConnectorConfig {
  apiBaseUrl: string;
  stateRoot: string;
  identityPath: string;
  mappingPath: string;
  syncIntervalSeconds: number;
  connectorId?: string;
  enrollmentCodeFile?: string;
  database: SourceAdapterConfig;
  databasePasswordFile: string;
  databaseWritePasswordFile?: string;
}

const CONFIG_KEYS = new Set(['apiBaseUrl', 'stateRoot', 'identityPath', 'mappingPath', 'syncIntervalSeconds', 'connectorId', 'enrollmentCodeFile', 'database']);
const DATABASE_KEYS = new Set(['driver', 'host', 'port', 'database', 'username', 'passwordFile', 'writeUsername', 'writePasswordFile', 'schema', 'ssl']);

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function assertInside(root: string, path: string, field: string): string {
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(path);
  const relation = relative(absoluteRoot, absolutePath);
  if (!isAbsolute(absoluteRoot) || relation.startsWith('..') || isAbsolute(relation)) throw new Error(`${field} must be inside stateRoot`);
  return absolutePath;
}

function absolutePath(value: unknown, field: string): string {
  const path = requiredString(value, field);
  if (!isAbsolute(path)) throw new Error(`${field} must be absolute`);
  return resolve(path);
}

export function parseConnectorConfig(value: unknown): Omit<ConnectorConfig, 'database'> & { database: Omit<SourceAdapterConfig, 'password'>; databasePasswordFile: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('connector config must be an object');
  const input = value as Record<string, unknown>;
  for (const key of Object.keys(input)) if (!CONFIG_KEYS.has(key)) throw new Error(`unknown config key: ${key}`);
  if (!input.database || typeof input.database !== 'object' || Array.isArray(input.database)) throw new Error('database config is required');
  const database = input.database as unknown as ConfigDatabaseInput & Record<string, unknown>;
  for (const key of Object.keys(database)) if (!DATABASE_KEYS.has(key)) throw new Error(`unknown database config key: ${key}`);

  const apiBaseUrl = new URL(requiredString(input.apiBaseUrl, 'apiBaseUrl'));
  if (apiBaseUrl.protocol !== 'https:' && !(apiBaseUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(apiBaseUrl.hostname))) throw new Error('apiBaseUrl requires HTTPS');
  if (apiBaseUrl.username || apiBaseUrl.password || apiBaseUrl.search || apiBaseUrl.hash) throw new Error('apiBaseUrl must not contain credentials or query data');
  const stateRootInput = requiredString(input.stateRoot, 'stateRoot');
  if (!isAbsolute(stateRootInput)) throw new Error('stateRoot must be absolute');
  const stateRoot = resolve(stateRootInput);
  const syncIntervalSeconds = Number(input.syncIntervalSeconds);
  if (!Number.isInteger(syncIntervalSeconds) || syncIntervalSeconds < 60) throw new Error('syncIntervalSeconds must be at least 60');
  if (!['postgres', 'mysql', 'mariadb', 'mssql'].includes(database.driver)) throw new Error('database driver is unsupported');
  const port = Number(database.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('database port is invalid');
  if (Boolean(database.writeUsername) !== Boolean(database.writePasswordFile)) throw new Error('writeUsername and writePasswordFile must be configured together');

  return {
    apiBaseUrl: apiBaseUrl.origin,
    stateRoot,
    identityPath: assertInside(stateRoot, requiredString(input.identityPath, 'identityPath'), 'identityPath'),
    mappingPath: assertInside(stateRoot, requiredString(input.mappingPath, 'mappingPath'), 'mappingPath'),
    syncIntervalSeconds,
    connectorId: typeof input.connectorId === 'string' && input.connectorId.trim() ? input.connectorId.trim() : undefined,
    enrollmentCodeFile: typeof input.enrollmentCodeFile === 'string' ? absolutePath(input.enrollmentCodeFile, 'enrollmentCodeFile') : undefined,
    databasePasswordFile: absolutePath(database.passwordFile, 'database.passwordFile'),
    ...(typeof database.writePasswordFile === 'string' && database.writePasswordFile.trim() ? { databaseWritePasswordFile: absolutePath(database.writePasswordFile, 'database.writePasswordFile') } : {}),
    database: {
      driver: database.driver,
      host: requiredString(database.host, 'database.host'),
      port,
      database: requiredString(database.database, 'database.database'),
      username: requiredString(database.username, 'database.username'),
      ...(typeof database.writeUsername === 'string' && database.writeUsername.trim() ? { writeUsername: requiredString(database.writeUsername, 'database.writeUsername') } : {}),
      schema: typeof database.schema === 'string' && database.schema.trim() ? database.schema.trim() : undefined,
      ssl: database.ssl === true,
    },
  };
}

export async function loadConnectorConfig(path: string): Promise<ConnectorConfig> {
  const fileValue = JSON.parse(await readFile(path, 'utf8')) as unknown;
  if (!fileValue || typeof fileValue !== 'object' || Array.isArray(fileValue)) throw new Error('connector config must be an object');
  const input = fileValue as Record<string, unknown>;
  if (!input.database || typeof input.database !== 'object' || Array.isArray(input.database)) throw new Error('database config is required');
  const database = input.database as Record<string, unknown>;
  const parsed = parseConnectorConfig({
    ...input,
    database: {
      ...database,
      ...(process.env.DB_HOST ? { host: process.env.DB_HOST } : {}),
      ...(process.env.DB_PORT ? { port: process.env.DB_PORT } : {}),
    },
  });
  const password = (await readFile(parsed.databasePasswordFile, 'utf8')).trim();
  if (!password) throw new Error('database password file is empty');
  let writePassword: string | undefined;
  if (parsed.databaseWritePasswordFile) {
    writePassword = (await readFile(parsed.databaseWritePasswordFile, 'utf8')).trim();
    if (!writePassword) throw new Error('database write password file is empty');
  }
  return { ...parsed, database: { ...parsed.database, password, ...(writePassword ? { writePassword } : {}) } };
}
