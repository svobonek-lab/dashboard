import { MssqlSourceAdapter } from './mssql.js';
import { MysqlSourceAdapter } from './mysql.js';
import { PostgresSourceAdapter } from './postgres.js';
import type { CanonicalRecordV1, ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';
import type { MappedSourceOperation } from './mappedOperations.js';

export type SourceDriver = 'postgres' | 'mysql' | 'mariadb' | 'mssql';

export interface SourceAdapterConfig {
  driver: SourceDriver;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  writeUsername?: string;
  writePassword?: string;
  schema?: string;
  ssl?: boolean;
}

export interface SourceColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  generated?: boolean;
  hasDefault?: boolean;
}

export interface SourceTable {
  schema: string;
  name: string;
  columns: SourceColumn[];
}

export interface SourceSchema {
  inspectedAt: string;
  tables: SourceTable[];
}

export interface IncrementalCursor {
  updatedAt?: string;
  primaryKey: string;
}

export interface IncrementalQuery {
  schema: string;
  table: string;
  primaryKey: string;
  updatedAtColumn?: string;
  columns: string[];
  limit: number;
  cursor?: IncrementalCursor;
}

export interface SourcePage {
  rows: Record<string, unknown>[];
  nextCursor: IncrementalCursor | null;
}

export interface ConnectionReport {
  ok: boolean;
  driver: SourceDriver;
  database: string;
}

export interface ReadOnlyReport {
  selectAllowed: boolean;
  writesDenied: boolean;
  checkedTable?: string;
}

export interface SourceAdapter {
  readonly driver: SourceDriver;
  testConnection(): Promise<ConnectionReport>;
  inspectSchema(): Promise<SourceSchema>;
  readPage(query: IncrementalQuery): Promise<SourcePage>;
  applyMappedOperation(operation: MappedSourceOperation, mapping: ConnectorMappingDefinitionV1, schema: SourceSchema): Promise<{ status: 'applied' | 'conflict'; sourceVersion?: string; record?: CanonicalRecordV1; replayed?: boolean }>;
  verifyReadOnly(): Promise<ReadOnlyReport>;
  close(): Promise<void>;
}

export function createSourceAdapter(config: SourceAdapterConfig): SourceAdapter {
  switch (config.driver) {
    case 'postgres': return new PostgresSourceAdapter(config);
    case 'mysql':
    case 'mariadb': return new MysqlSourceAdapter(config);
    case 'mssql': return new MssqlSourceAdapter(config);
  }
}
