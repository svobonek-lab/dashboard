import mysql, { type RowDataPacket } from 'mysql2/promise';

import { findKnownTable, knownColumns, normalizeRows, quoteMysqlIdentifier, validatePageLimit } from './sqlSafety.js';
import type { IncrementalQuery, ReadOnlyReport, SourceAdapter, SourceAdapterConfig, SourcePage, SourceSchema } from './types.js';
import { applyMappedOperationWithTransaction, type MappedSourceOperation } from './mappedOperations.js';
import type { ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';

export class MysqlSourceAdapter implements SourceAdapter {
  readonly driver: 'mysql' | 'mariadb';
  private readonly pool: mysql.Pool;
  private readonly writePool: mysql.Pool | null;
  private schemaCache: SourceSchema | null = null;

  constructor(private readonly config: SourceAdapterConfig) {
    this.driver = config.driver === 'mariadb' ? 'mariadb' : 'mysql';
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
      waitForConnections: true,
      connectionLimit: 3,
      connectTimeout: 10_000,
      dateStrings: true,
    });
    this.writePool = config.writeUsername && config.writePassword ? mysql.createPool({
      host: config.host, port: config.port, database: config.database, user: config.writeUsername, password: config.writePassword,
      ssl: config.ssl ? { rejectUnauthorized: true } : undefined, waitForConnections: true, connectionLimit: 2, connectTimeout: 10_000, dateStrings: true,
    }) : null;
  }

  private async connection(): Promise<mysql.PoolConnection> {
    const connection = await this.pool.getConnection();
    try {
      await connection.query('SET SESSION TRANSACTION READ ONLY');
      return connection;
    } catch (error) {
      connection.release();
      throw error;
    }
  }

  async testConnection() {
    const connection = await this.connection();
    try { await connection.query('SELECT 1'); } finally { connection.release(); }
    return { ok: true, driver: this.driver, database: this.config.database };
  }

  async inspectSchema(): Promise<SourceSchema> {
    const [rows] = await this.pool.execute<RowDataPacket[]>(`
      SELECT table_schema, table_name, column_name, data_type, is_nullable, column_key, extra
      FROM information_schema.columns
      WHERE table_schema = ?
      ORDER BY table_name, ordinal_position
    `, [this.config.database]);
    const tables = new Map<string, SourceSchema['tables'][number]>();
    for (const row of rows) {
      const schema = String(row.table_schema);
      const name = String(row.table_name);
      const key = `${schema}.${name}`;
      const table = tables.get(key) ?? { schema, name, columns: [] };
      table.columns.push({ name: String(row.column_name), dataType: String(row.data_type), nullable: row.is_nullable === 'YES', primaryKey: row.column_key === 'PRI', generated: /auto_increment|generated/i.test(String(row.extra ?? '')), hasDefault: row.column_default !== null && row.column_default !== undefined || /auto_increment|generated/i.test(String(row.extra ?? '')) });
      tables.set(key, table);
    }
    this.schemaCache = { inspectedAt: new Date().toISOString(), tables: [...tables.values()] };
    return this.schemaCache;
  }

  async readPage(query: IncrementalQuery): Promise<SourcePage> {
    const schema = this.schemaCache ?? await this.inspectSchema();
    const table = findKnownTable(schema, query.schema, query.table);
    const available = knownColumns(table, [...query.columns, query.primaryKey, ...(query.updatedAtColumn ? [query.updatedAtColumn] : [])]);
    const q = (name: string) => quoteMysqlIdentifier(name, available);
    const params: Array<string | number> = [];
    let where = '';
    if (query.cursor) {
      if (query.updatedAtColumn && query.cursor.updatedAt) {
        params.push(query.cursor.updatedAt, query.cursor.updatedAt, query.cursor.primaryKey);
        where = `WHERE (${q(query.updatedAtColumn)} > ? OR (${q(query.updatedAtColumn)} = ? AND ${q(query.primaryKey)} > ?))`;
      } else {
        params.push(query.cursor.primaryKey);
        where = `WHERE ${q(query.primaryKey)} > ?`;
      }
    }
    params.push(validatePageLimit(query.limit));
    const order = query.updatedAtColumn ? `${q(query.updatedAtColumn)}, ${q(query.primaryKey)}` : q(query.primaryKey);
    const tableName = `${quoteMysqlIdentifier(query.schema, new Set([query.schema]))}.${quoteMysqlIdentifier(query.table, new Set([query.table]))}`;
    const connection = await this.connection();
    try {
      const [result] = await connection.execute<RowDataPacket[]>(`SELECT ${query.columns.map(q).join(', ')} FROM ${tableName} ${where} ORDER BY ${order} LIMIT ?`, params);
      const rows = normalizeRows(result as Record<string, unknown>[]);
      return { rows, nextCursor: cursorFromRows(rows, query) };
    } finally {
      connection.release();
    }
  }

  async applyMappedOperation(operation: MappedSourceOperation, mapping: ConnectorMappingDefinitionV1, schema: SourceSchema) {
    if (!this.writePool) throw new Error('BYODB_WRITE_CREDENTIALS_REQUIRED');
    const connection = await this.writePool.getConnection();
    try {
      return await applyMappedOperationWithTransaction(this.driver, operation, mapping, schema, {
        begin: async () => { await connection.beginTransaction(); },
        savepoint: async name => { await connection.query(`SAVEPOINT ${name}`); },
        query: async statement => { const [rows] = await connection.execute<RowDataPacket[]>(statement.sql, statement.values as (string | number | boolean | null)[]); return rows as Record<string, unknown>[]; },
        rollbackToSavepoint: async name => { await connection.query(`ROLLBACK TO SAVEPOINT ${name}`); },
        releaseSavepoint: async name => { await connection.query(`RELEASE SAVEPOINT ${name}`); },
        commit: async () => { await connection.commit(); },
        rollback: async () => { await connection.rollback(); },
        isDuplicateKeyError: error => Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'ER_DUP_ENTRY'),
      });
    } finally { connection.release(); }
  }

  async verifyReadOnly(): Promise<ReadOnlyReport> {
    const schema = this.schemaCache ?? await this.inspectSchema();
    const table = schema.tables[0];
    if (!table) return { selectAllowed: false, writesDenied: false };
    const connection = await this.connection();
    let writesDenied = false;
    try {
      await connection.beginTransaction();
      const tableName = `${quoteMysqlIdentifier(table.schema, new Set([table.schema]))}.${quoteMysqlIdentifier(table.name, new Set([table.name]))}`;
      await connection.query(`DELETE FROM ${tableName} WHERE 1 = 0`);
    } catch {
      writesDenied = true;
    } finally {
      await connection.rollback().catch(() => undefined);
      connection.release();
    }
    return { selectAllowed: true, writesDenied, checkedTable: `${table.schema}.${table.name}` };
  }

  async close(): Promise<void> { await Promise.all([this.pool.end(), this.writePool?.end()]); }
}

function cursorFromRows(rows: Record<string, unknown>[], query: IncrementalQuery) {
  const last = rows.at(-1);
  if (!last) return null;
  return { primaryKey: String(last[query.primaryKey]), ...(query.updatedAtColumn ? { updatedAt: String(last[query.updatedAtColumn]) } : {}) };
}
