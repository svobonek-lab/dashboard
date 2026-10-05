import sql from 'mssql';

import { findKnownTable, knownColumns, normalizeRows, quoteMssqlIdentifier, validatePageLimit } from './sqlSafety.js';
import type { IncrementalQuery, ReadOnlyReport, SourceAdapter, SourceAdapterConfig, SourcePage, SourceSchema } from './types.js';

export class MssqlSourceAdapter implements SourceAdapter {
  readonly driver = 'mssql' as const;
  private readonly pool: sql.ConnectionPool;
  private connected: Promise<sql.ConnectionPool> | null = null;
  private schemaCache: SourceSchema | null = null;

  constructor(private readonly config: SourceAdapterConfig) {
    this.pool = new sql.ConnectionPool({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      pool: { max: 3, min: 0, idleTimeoutMillis: 30_000 },
      options: { encrypt: Boolean(config.ssl), trustServerCertificate: !config.ssl, enableArithAbort: true },
      connectionTimeout: 10_000,
      requestTimeout: 30_000,
    });
  }

  private connect(): Promise<sql.ConnectionPool> {
    this.connected ??= this.pool.connect();
    return this.connected;
  }

  async testConnection() {
    await (await this.connect()).request().query('SELECT 1 AS ok');
    return { ok: true, driver: this.driver, database: this.config.database };
  }

  async inspectSchema(): Promise<SourceSchema> {
    const pool = await this.connect();
    const request = pool.request();
    if (this.config.schema) request.input('schema', sql.NVarChar(128), this.config.schema);
    const result = await request.query(`
      SELECT s.name AS table_schema, t.name AS table_name, c.name AS column_name,
             ty.name AS data_type, c.is_nullable,
             CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS primary_key
      FROM sys.tables t
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      JOIN sys.columns c ON c.object_id = t.object_id
      JOIN sys.types ty ON ty.user_type_id = c.user_type_id
      LEFT JOIN (
        SELECT ic.object_id, ic.column_id FROM sys.indexes i
        JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        WHERE i.is_primary_key = 1
      ) pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
      ${this.config.schema ? 'WHERE s.name = @schema' : ''}
      ORDER BY s.name, t.name, c.column_id
    `);
    const tables = new Map<string, SourceSchema['tables'][number]>();
    for (const row of result.recordset as Record<string, unknown>[]) {
      const schema = String(row.table_schema);
      const name = String(row.table_name);
      const key = `${schema}.${name}`;
      const table = tables.get(key) ?? { schema, name, columns: [] };
      table.columns.push({ name: String(row.column_name), dataType: String(row.data_type), nullable: Boolean(row.is_nullable), primaryKey: Boolean(row.primary_key) });
      tables.set(key, table);
    }
    this.schemaCache = { inspectedAt: new Date().toISOString(), tables: [...tables.values()] };
    return this.schemaCache;
  }

  async readPage(query: IncrementalQuery): Promise<SourcePage> {
    const schema = this.schemaCache ?? await this.inspectSchema();
    const table = findKnownTable(schema, query.schema, query.table);
    const available = knownColumns(table, [...query.columns, query.primaryKey, ...(query.updatedAtColumn ? [query.updatedAtColumn] : [])]);
    const q = (name: string) => quoteMssqlIdentifier(name, available);
    const request = (await this.connect()).request().input('limit', sql.Int, validatePageLimit(query.limit));
    let where = '';
    if (query.cursor) {
      request.input('primaryKey', sql.NVarChar(512), query.cursor.primaryKey);
      if (query.updatedAtColumn && query.cursor.updatedAt) {
        request.input('updatedAt', sql.DateTimeOffset, new Date(query.cursor.updatedAt));
        where = `WHERE (${q(query.updatedAtColumn)} > @updatedAt OR (${q(query.updatedAtColumn)} = @updatedAt AND ${q(query.primaryKey)} > @primaryKey))`;
      } else {
        where = `WHERE ${q(query.primaryKey)} > @primaryKey`;
      }
    }
    const order = query.updatedAtColumn ? `${q(query.updatedAtColumn)}, ${q(query.primaryKey)}` : q(query.primaryKey);
    const tableName = `${quoteMssqlIdentifier(query.schema, new Set([query.schema]))}.${quoteMssqlIdentifier(query.table, new Set([query.table]))}`;
    const result = await request.query(`SELECT TOP (@limit) ${query.columns.map(q).join(', ')} FROM ${tableName} ${where} ORDER BY ${order}`);
    const rows = normalizeRows(result.recordset as Record<string, unknown>[]);
    return { rows, nextCursor: cursorFromRows(rows, query) };
  }

  async verifyReadOnly(): Promise<ReadOnlyReport> {
    const schema = this.schemaCache ?? await this.inspectSchema();
    const table = schema.tables[0];
    if (!table) return { selectAllowed: false, writesDenied: false };
    const transaction = new sql.Transaction(await this.connect());
    let writesDenied = false;
    await transaction.begin();
    try {
      const tableName = `${quoteMssqlIdentifier(table.schema, new Set([table.schema]))}.${quoteMssqlIdentifier(table.name, new Set([table.name]))}`;
      await new sql.Request(transaction).query(`DELETE FROM ${tableName} WHERE 1 = 0`);
    } catch {
      writesDenied = true;
    } finally {
      await transaction.rollback().catch(() => undefined);
    }
    return { selectAllowed: true, writesDenied, checkedTable: `${table.schema}.${table.name}` };
  }

  async close(): Promise<void> { if (this.connected) await this.pool.close(); }
}

function cursorFromRows(rows: Record<string, unknown>[], query: IncrementalQuery) {
  const last = rows.at(-1);
  if (!last) return null;
  return { primaryKey: String(last[query.primaryKey]), ...(query.updatedAtColumn ? { updatedAt: String(last[query.updatedAtColumn]) } : {}) };
}
