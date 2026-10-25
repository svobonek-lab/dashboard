import pg from 'pg';

import { findKnownTable, knownColumns, normalizeRows, quotePostgresIdentifier, validatePageLimit } from './sqlSafety.js';
import type { IncrementalQuery, ReadOnlyReport, SourceAdapter, SourceAdapterConfig, SourcePage, SourceSchema } from './types.js';
import { applyMappedOperationWithTransaction, type MappedSourceOperation } from './mappedOperations.js';
import type { ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';

export class PostgresSourceAdapter implements SourceAdapter {
  readonly driver = 'postgres' as const;
  private readonly pool: pg.Pool;
  private readonly writePool: pg.Pool | null;
  private schemaCache: SourceSchema | null = null;

  constructor(private readonly config: SourceAdapterConfig) {
    this.pool = new pg.Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
      options: '--default_transaction_read_only=on',
      max: 3,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
    this.writePool = config.writeUsername && config.writePassword ? new pg.Pool({
      host: config.host, port: config.port, database: config.database, user: config.writeUsername, password: config.writePassword,
      ssl: config.ssl ? { rejectUnauthorized: true } : undefined, max: 2, connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000,
    }) : null;
  }

  async testConnection() {
    await this.pool.query('SELECT 1');
    return { ok: true, driver: this.driver, database: this.config.database };
  }

  async inspectSchema(): Promise<SourceSchema> {
    const values = this.config.schema ? [this.config.schema] : [];
    const filter = this.config.schema ? 'AND c.table_schema = $1' : "AND c.table_schema NOT IN ('pg_catalog', 'information_schema')";
    const result = await this.pool.query(`
      SELECT c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.is_identity, c.is_generated, c.column_default,
             EXISTS (
               SELECT 1 FROM information_schema.table_constraints tc
               JOIN information_schema.key_column_usage kcu
                 ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
               WHERE tc.constraint_type = 'PRIMARY KEY'
                 AND tc.table_schema = c.table_schema AND tc.table_name = c.table_name
                 AND kcu.column_name = c.column_name
             ) AS primary_key
      FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE t.table_type = 'BASE TABLE' ${filter}
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
    `, values);
    this.schemaCache = rowsToSchema(result.rows);
    return this.schemaCache;
  }

  async readPage(query: IncrementalQuery): Promise<SourcePage> {
    const schema = this.schemaCache ?? await this.inspectSchema();
    const table = findKnownTable(schema, query.schema, query.table);
    const available = knownColumns(table, [...query.columns, query.primaryKey, ...(query.updatedAtColumn ? [query.updatedAtColumn] : [])]);
    const q = (name: string) => quotePostgresIdentifier(name, available);
    const selected = query.columns.map(q).join(', ');
    const params: unknown[] = [];
    let where = '';
    if (query.cursor) {
      if (query.updatedAtColumn && query.cursor.updatedAt) {
        params.push(query.cursor.updatedAt, query.cursor.primaryKey);
        where = `WHERE (${q(query.updatedAtColumn)} > $1 OR (${q(query.updatedAtColumn)} = $1 AND ${q(query.primaryKey)} > $2))`;
      } else {
        params.push(query.cursor.primaryKey);
        where = `WHERE ${q(query.primaryKey)} > $1`;
      }
    }
    params.push(validatePageLimit(query.limit));
    const order = query.updatedAtColumn ? `${q(query.updatedAtColumn)}, ${q(query.primaryKey)}` : q(query.primaryKey);
    const tableName = `${quotePostgresIdentifier(query.schema, new Set([query.schema]))}.${quotePostgresIdentifier(query.table, new Set([query.table]))}`;
    const result = await this.pool.query(`SELECT ${selected} FROM ${tableName} ${where} ORDER BY ${order} LIMIT $${params.length}`, params);
    const rows = normalizeRows(result.rows);
    return { rows, nextCursor: cursorFromRows(rows, query) };
  }

  async applyMappedOperation(operation: MappedSourceOperation, mapping: ConnectorMappingDefinitionV1, schema: SourceSchema) {
    if (!this.writePool) throw new Error('BYODB_WRITE_CREDENTIALS_REQUIRED');
    const client = await this.writePool.connect();
    try {
      return await applyMappedOperationWithTransaction(this.driver, operation, mapping, schema, {
        begin: async () => { await client.query('BEGIN'); },
        savepoint: async name => { await client.query(`SAVEPOINT ${name}`); },
        query: async statement => (await client.query(statement.sql, statement.values)).rows as Record<string, unknown>[],
        rollbackToSavepoint: async name => { await client.query(`ROLLBACK TO SAVEPOINT ${name}`); },
        releaseSavepoint: async name => { await client.query(`RELEASE SAVEPOINT ${name}`); },
        commit: async () => { await client.query('COMMIT'); },
        rollback: async () => { await client.query('ROLLBACK'); },
        isDuplicateKeyError: error => Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505'),
      });
    } finally { client.release(); }
  }

  async verifyReadOnly(): Promise<ReadOnlyReport> {
    const schema = this.schemaCache ?? await this.inspectSchema();
    const table = schema.tables[0];
    if (!table) return { selectAllowed: false, writesDenied: false };
    const client = await this.pool.connect();
    let writesDenied = false;
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM ${quotePostgresIdentifier(table.schema, new Set([table.schema]))}.${quotePostgresIdentifier(table.name, new Set([table.name]))} WHERE 1 = 0`);
    } catch {
      writesDenied = true;
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
    return { selectAllowed: true, writesDenied, checkedTable: `${table.schema}.${table.name}` };
  }

  async close(): Promise<void> { await Promise.all([this.pool.end(), this.writePool?.end()]); }
}

function rowsToSchema(rows: Record<string, unknown>[]): SourceSchema {
  const tables = new Map<string, SourceSchema['tables'][number]>();
  for (const row of rows) {
    const schema = String(row.table_schema);
    const name = String(row.table_name);
    const key = `${schema}.${name}`;
    const table = tables.get(key) ?? { schema, name, columns: [] };
    table.columns.push({ name: String(row.column_name), dataType: String(row.data_type), nullable: row.is_nullable === 'YES', primaryKey: Boolean(row.primary_key), generated: row.is_identity === 'YES' || row.is_generated === 'ALWAYS' || String(row.column_default ?? '').startsWith('nextval('), hasDefault: row.column_default !== null && row.column_default !== undefined });
    tables.set(key, table);
  }
  return { inspectedAt: new Date().toISOString(), tables: [...tables.values()] };
}

function cursorFromRows(rows: Record<string, unknown>[], query: IncrementalQuery) {
  const last = rows.at(-1);
  if (!last) return null;
  return { primaryKey: String(last[query.primaryKey]), ...(query.updatedAtColumn ? { updatedAt: String(last[query.updatedAtColumn]) } : {}) };
}
