import type { CompanyBranding, Employee, ICRMRepository, Lead, LeadStoredFile, StorageMode } from './types';
import { supabase } from '../supabase';

export interface ByodbContext {
  mode: 'managed_cloud' | 'byodb';
  driver: 'postgres' | 'mysql' | 'mariadb' | 'mssql' | null;
  connectorId: string | null;
  mappingVersion: number | null;
  mappedTargets: string[];
  companyMappingVersion: number | null;
  companyMappedTargets: string[];
  writeEnabled: boolean;
  connectorStatus: string | null;
}

interface ByodbProjection { externalId: string; fingerprint: string; payload: Record<string, unknown> }

const STATUS_FROM_SOURCE: Record<string, string> = { new: 'New', contacted: 'Contacted', scheduled: 'Quote', in_progress: 'In Progress', won: 'Completed', lost: 'Lost' };
const STATUS_TO_SOURCE: Record<string, string> = { New: 'new', Contacted: 'contacted', Quote: 'scheduled', 'In Progress': 'in_progress', Completed: 'won', Lost: 'lost' };
const PRIORITY_FROM_SOURCE: Record<string, string> = { low: 'Low', normal: 'Medium', high: 'High' };
const PRIORITY_TO_SOURCE: Record<string, string> = { Low: 'low', Medium: 'normal', High: 'high' };

export class ByodbOperationPendingError extends Error {
  readonly status: 'pending' | 'processing';
  constructor(readonly operationId: string, status: string, readonly externalId?: string) {
    const resolvedStatus = status === 'processing' ? 'processing' : 'pending';
    super(resolvedStatus === 'processing' ? 'Změna se zpracovává ve firemní databázi.' : 'Změna čeká na připojení ke firemní databázi. Zatím není uložena.');
    this.name = 'ByodbOperationPendingError';
    this.status = resolvedStatus;
  }
}

export class ByodbOperationConflictError extends Error {
  readonly status: 'conflict' | 'failed';
  constructor(readonly operationId: string, status: string, readonly externalId?: string) {
    const resolvedStatus = status === 'conflict' ? 'conflict' : 'failed';
    super(resolvedStatus === 'conflict' ? 'Zdrojová databáze se od poslední synchronizace změnila. Znovu načtěte záznam a opakujte úpravu.' : 'Firemní databáze změnu odmítla. Zkontrolujte mapování a oprávnění.');
    this.name = 'ByodbOperationConflictError';
    this.status = resolvedStatus;
  }
}

export interface StablePendingReference {
  externalId: string;
  idempotencyKey: string;
  storageKey: string;
}

interface PendingReferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const pendingMemory = new Map<string, string>();
const memoryStorage: PendingReferenceStorage = {
  getItem: key => pendingMemory.get(key) ?? null,
  setItem: (key, value) => { pendingMemory.set(key, value); },
  removeItem: key => { pendingMemory.delete(key); },
};

function currentPendingStorage(): PendingReferenceStorage {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : memoryStorage; }
  catch { return memoryStorage; }
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${sortedJson(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export async function stablePendingReference(
  companyId: string, entity: 'company' | 'lead', action: 'create' | 'update' | 'delete',
  externalId: string | null, expectedSourceVersion: string | null, payload: Record<string, unknown>,
  storage: PendingReferenceStorage = currentPendingStorage(),
): Promise<StablePendingReference> {
  const identity = `${companyId}|${entity}|${action}|${externalId ?? ''}|${expectedSourceVersion ?? ''}|${sortedJson(payload)}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = `stavbaflow:byodb:pending:${fingerprint}`;
  try {
    const existing = storage.getItem(storageKey);
    if (existing) {
      const parsed = JSON.parse(existing) as Partial<StablePendingReference>;
      if (typeof parsed.externalId === 'string' && typeof parsed.idempotencyKey === 'string'
        && /^[0-9a-f-]{36}$/i.test(parsed.externalId) && /^[0-9a-f-]{36}$/i.test(parsed.idempotencyKey)) {
        return { externalId: parsed.externalId, idempotencyKey: parsed.idempotencyKey, storageKey };
      }
    }
  } catch {
    try {
      const existing = memoryStorage.getItem(storageKey);
      if (existing) {
        const parsed = JSON.parse(existing) as Partial<StablePendingReference>;
        if (typeof parsed.externalId === 'string' && typeof parsed.idempotencyKey === 'string'
          && /^[0-9a-f-]{36}$/i.test(parsed.externalId) && /^[0-9a-f-]{36}$/i.test(parsed.idempotencyKey)) {
          return { externalId: parsed.externalId, idempotencyKey: parsed.idempotencyKey, storageKey };
        }
      }
    } catch { /* Generate a replacement reference below. */ }
  }
  const reference = { externalId: externalId ?? crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), storageKey };
  try { storage.setItem(storageKey, JSON.stringify({ externalId: reference.externalId, idempotencyKey: reference.idempotencyKey })); }
  catch { memoryStorage.setItem(storageKey, JSON.stringify({ externalId: reference.externalId, idempotencyKey: reference.idempotencyKey })); }
  return reference;
}

function clearPendingReference(reference: StablePendingReference): void {
  try { currentPendingStorage().removeItem(reference.storageKey); } catch { /* Expiry is bounded by browser session lifetime. */ }
  memoryStorage.removeItem(reference.storageKey);
}

export function byodbFeatureEnabled(environment: Record<string, unknown>): boolean {
  return environment.VITE_BYODB_ENABLED === 'true';
}

export interface ByodbRepositoryOptions {
  enabled: boolean;
  request?: (companyId: string, body: Record<string, unknown>) => Promise<unknown>;
}

export function mapByodbProjectionToLead(record: ByodbProjection, companyId: string): Lead {
  const payload = record.payload;
  return {
    id: record.externalId,
    organization_id: companyId,
    source: 'connector',
    sourceVersion: record.fingerprint,
    title: String(payload.title ?? ''),
    description: String(payload.description ?? ''),
    city: String(payload.city ?? ''),
    address: String(payload.address ?? ''),
    customerName: String(payload.customer ?? ''),
    customerPhone: String(payload.phone ?? ''),
    customerEmail: String(payload.email ?? ''),
    preferredDate: String(payload.scheduledAt ?? ''),
    price: typeof payload.value === 'number' ? payload.value : Number(payload.value ?? 0),
    status: STATUS_FROM_SOURCE[String(payload.status ?? 'new')] ?? String(payload.status ?? 'new'),
    priority: PRIORITY_FROM_SOURCE[String(payload.priority ?? 'normal')] ?? String(payload.priority ?? 'normal'),
    assignedEmployeeId: '',
    assignedEmployeeName: String(payload.assignedToEmail ?? ''),
    thumbnail: '', photos: [], files: [], checklist: [], aiSummary: { jobType: String(payload.title ?? ''), complexity: 'Medium', estimatedRange: '', assignedEmployee: String(payload.assignedToEmail ?? ''), risks: [], recommendedNextStep: '' },
    timeline: [], aiChat: [], history: [],
  };
}

export function mapByodbProjectionToBranding(record: ByodbProjection, current: CompanyBranding, mappedTargets: string[]): CompanyBranding {
  const payload = record.payload;
  const targets = new Set(mappedTargets);
  return {
    ...current,
    name: typeof payload.name === 'string' ? payload.name : '',
    email: targets.has('email') && typeof payload.email === 'string' ? payload.email : '',
    phone: targets.has('phone') && typeof payload.phone === 'string' ? payload.phone : '',
    address: targets.has('address') && typeof payload.address === 'string' ? payload.address : '',
    city: targets.has('city') && typeof payload.city === 'string' ? payload.city : '',
    website: targets.has('website') && typeof payload.website === 'string' ? payload.website : '',
  };
}

export function buildByodbCompanyPayload(branding: CompanyBranding, mappedTargets: string[]): Record<string, string> {
  const pairs: Array<[keyof CompanyBranding, string]> = [['name', 'name'], ['email', 'email'], ['phone', 'phone'], ['address', 'address'], ['city', 'city'], ['website', 'website']];
  const targets = new Set(mappedTargets);
  const payload: Record<string, string> = {};
  for (const [source, target] of pairs) {
    const value = branding[source];
    if (value === undefined) continue;
    if (!targets.has(target)) {
      if (String(value).trim() === '') continue;
      throw new Error('BYODB_FIELD_NOT_MAPPED');
    }
    payload[target] = String(value).trim();
  }
  if (!payload.name) throw new Error('BYODB_COMPANY_NAME_REQUIRED');
  return payload;
}

export function buildByodbLeadPayload(lead: Partial<Lead>, context: ByodbContext, assignedEmployeeEmail?: string): Record<string, string | number | boolean | null> {
  const pairs: Array<[keyof Lead, string, (value: unknown) => string | number | boolean | null]> = [
    ['title', 'title', value => String(value)], ['customerName', 'customer', value => String(value)],
    ['customerEmail', 'email', value => String(value).trim().toLowerCase()], ['customerPhone', 'phone', value => String(value)],
    ['description', 'description', value => String(value)], ['address', 'address', value => String(value)], ['city', 'city', value => String(value)],
    ['price', 'value', value => { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0) throw new Error('BYODB_VALUE_INVALID'); return parsed; }],
    ['status', 'status', value => { const mapped = STATUS_TO_SOURCE[String(value)]; if (!mapped) throw new Error('BYODB_STATUS_INVALID'); return mapped; }],
    ['priority', 'priority', value => { const mapped = PRIORITY_TO_SOURCE[String(value)]; if (!mapped) throw new Error('BYODB_PRIORITY_INVALID'); return mapped; }],
    ['preferredDate', 'scheduledAt', value => value ? new Date(String(value)).toISOString() : null],
  ];
  const mappedTargets = new Set(context.mappedTargets);
  const payload: Record<string, string | number | boolean | null> = {};
  for (const [source, target, convert] of pairs) {
    const value = lead[source];
    if (value === undefined) continue;
    if (!mappedTargets.has(target)) throw new Error('BYODB_FIELD_NOT_MAPPED');
    payload[target] = convert(value);
  }
  if (lead.assignedEmployeeId !== undefined) {
    if (!mappedTargets.has('assignedToEmail')) throw new Error('BYODB_FIELD_NOT_MAPPED');
    if (lead.assignedEmployeeId && !assignedEmployeeEmail) throw new Error('BYODB_EMPLOYEE_NOT_FOUND');
    payload.assignedToEmail = lead.assignedEmployeeId ? assignedEmployeeEmail!.trim().toLowerCase() : null;
  }
  if (!Object.keys(payload).length) throw new Error('BYODB_NO_MAPPED_FIELDS');
  return payload;
}

export class ByodbRepository {
  private readonly options: ByodbRepositoryOptions;
  constructor(private readonly fallback: ICRMRepository, options: ByodbRepositoryOptions = { enabled: byodbFeatureEnabled((import.meta as any).env || {}) }) {
    this.options = options;
  }

  async request<T>(companyId: string, body: Record<string, unknown>): Promise<T> {
    if (this.options.request) return await this.options.request(companyId, body) as T;
    if (!supabase) throw new Error('Pro tuto akci se znovu přihlaste.');
    const { data, error } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (error || !token) throw new Error('Pro tuto akci se znovu přihlaste.');
    const response = await fetch('/api/connector/operations', {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, companyId }),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const code = typeof result.code === 'string' ? result.code : 'BYODB_REQUEST_FAILED';
      throw new Error(code);
    }
    return result as T;
  }

  async getContext(companyId: string): Promise<ByodbContext> {
    if (!this.options.enabled) return { mode: 'managed_cloud', driver: null, connectorId: null, mappingVersion: null, mappedTargets: [], companyMappingVersion: null, companyMappedTargets: [], writeEnabled: false, connectorStatus: null };
    const context = await this.request<ByodbContext>(companyId, { action: 'context' });
    if (!context || !['managed_cloud', 'byodb'].includes(context.mode) || !Array.isArray(context.mappedTargets) || !Array.isArray(context.companyMappedTargets)) throw new Error('DATABASE_MODE_INVALID');
    return context;
  }

  async getLeads(companyId: string): Promise<Lead[]> {
    const { records } = await this.request<{ records: ByodbProjection[] }>(companyId, { action: 'records' });
    if (!Array.isArray(records)) throw new Error('BYODB_RECORDS_INVALID');
    const employees = await this.fallback.getEmployees(companyId);
    return records.map(record => {
      const lead = mapByodbProjectionToLead(record, companyId);
      const employee = employees.find(candidate => String(candidate.email ?? '').trim().toLowerCase() === String(record.payload.assignedToEmail ?? '').trim().toLowerCase());
      lead.assignedEmployeeId = employee?.id ?? '';
      lead.assignedEmployeeName = employee?.name ?? String(record.payload.assignedToEmail ?? '');
      return lead;
    });
  }

  async saveLead(companyId: string, lead: Partial<Lead>): Promise<Lead> {
    const context = await this.getContext(companyId);
    if (!context.writeEnabled || !context.connectorId || !context.mappingVersion) throw new Error('BYODB_WRITE_DISABLED');
    const externalId = lead.id || null;
    const current = lead.id ? (await this.request<{ records: ByodbProjection[] }>(companyId, { action: 'records' })).records.find(row => row.externalId === lead.id) : undefined;
    if (lead.id && !current) throw new Error('BYODB_RECORD_NOT_FOUND');
    const employees = lead.assignedEmployeeId !== undefined ? await this.fallback.getEmployees(companyId) : [];
    const assignedEmployeeEmail = employees.find(employee => employee.id === lead.assignedEmployeeId)?.email;
    const payload = buildByodbLeadPayload(lead, context, assignedEmployeeEmail);
    const reference = await stablePendingReference(companyId, 'lead', lead.id ? 'update' : 'create', externalId, current?.fingerprint ?? null, payload);
    const response = await this.request<{ operationId: string; status: string }>(companyId, {
      action: 'create', connectorId: context.connectorId,
      operation: { version: 1, idempotencyKey: reference.idempotencyKey, mappingVersion: context.mappingVersion, entityType: 'lead', action: lead.id ? 'update' : 'create', externalId: reference.externalId, expectedSourceVersion: current?.fingerprint ?? null, payload },
    });
    if (response.status === 'applied') {
      clearPendingReference(reference);
      const saved = (await this.getLeads(companyId)).find(item => item.id === reference.externalId);
      if (saved) return saved;
      throw new Error('BYODB_PROJECTION_NOT_UPDATED');
    }
    if (response.status === 'conflict' || response.status === 'failed') throw new ByodbOperationConflictError(response.operationId, response.status, reference.externalId);
    if (response.status !== 'pending' && response.status !== 'processing') throw new Error('BYODB_OPERATION_STATUS_INVALID');
    throw new ByodbOperationPendingError(response.operationId, response.status, reference.externalId);
  }

  async updateLeadStatus(companyId: string, leadId: string, status: string): Promise<void> {
    const current = (await this.request<{ records: ByodbProjection[] }>(companyId, { action: 'records' })).records.find(row => row.externalId === leadId);
    if (!current) throw new Error('BYODB_RECORD_NOT_FOUND');
    const saved = await this.saveLead(companyId, { id: leadId, status: status as Lead['status'], sourceVersion: current.fingerprint } as Partial<Lead>);
    void saved;
  }

  async deleteLead(companyId: string, leadId: string): Promise<void> {
    const context = await this.getContext(companyId);
    if (!context.writeEnabled || !context.connectorId || !context.mappingVersion) throw new Error('BYODB_WRITE_DISABLED');
    const current = (await this.request<{ records: ByodbProjection[] }>(companyId, { action: 'records' })).records.find(row => row.externalId === leadId);
    if (!current) throw new Error('BYODB_RECORD_NOT_FOUND');
    const reference = await stablePendingReference(companyId, 'lead', 'delete', leadId, current.fingerprint, {});
    const response = await this.request<{ operationId: string; status: string }>(companyId, {
      action: 'create', connectorId: context.connectorId,
      operation: { version: 1, idempotencyKey: reference.idempotencyKey, mappingVersion: context.mappingVersion, entityType: 'lead', action: 'delete', externalId: leadId, expectedSourceVersion: current.fingerprint, payload: {} },
    });
    if (response.status === 'applied') { clearPendingReference(reference); return; }
    if (response.status === 'conflict' || response.status === 'failed') throw new ByodbOperationConflictError(response.operationId, response.status, leadId);
    if (response.status !== 'pending' && response.status !== 'processing') throw new Error('BYODB_OPERATION_STATUS_INVALID');
    throw new ByodbOperationPendingError(response.operationId, response.status, leadId);
  }

  async getBranding(companyId: string): Promise<CompanyBranding> {
    const context = await this.getContext(companyId);
    if (context.mode !== 'byodb') return this.fallback.getBranding(companyId);
    const [{ records }, current] = await Promise.all([
      this.request<{ records: ByodbProjection[] }>(companyId, { action: 'records', entityType: 'company' }),
      this.fallback.getBranding(companyId),
    ]);
    if (!Array.isArray(records) || records.length !== 1) throw new Error('BYODB_COMPANY_RECORD_AMBIGUOUS');
    return mapByodbProjectionToBranding(records[0]!, current, context.companyMappedTargets);
  }

  async saveBranding(companyId: string, branding: CompanyBranding): Promise<void> {
    const context = await this.getContext(companyId);
    if (context.mode !== 'byodb') return this.fallback.saveBranding(companyId, branding);
    if (!context.writeEnabled || !context.connectorId || !context.companyMappingVersion) throw new Error('BYODB_WRITE_DISABLED');
    const { records } = await this.request<{ records: ByodbProjection[] }>(companyId, { action: 'records', entityType: 'company' });
    if (!Array.isArray(records) || records.length !== 1) throw new Error('BYODB_COMPANY_RECORD_AMBIGUOUS');
    const current = records[0]!;
    const payload = buildByodbCompanyPayload(branding, context.companyMappedTargets);
    const reference = await stablePendingReference(companyId, 'company', 'update', current.externalId, current.fingerprint, payload);
    const result = await this.request<{ operationId: string; status: string }>(companyId, {
      action: 'create', connectorId: context.connectorId,
      operation: { version: 1, idempotencyKey: reference.idempotencyKey, mappingVersion: context.companyMappingVersion, entityType: 'company', action: 'update', externalId: current.externalId, expectedSourceVersion: current.fingerprint, payload },
    });
    if (result.status === 'applied') { clearPendingReference(reference); return; }
    if (result.status === 'conflict' || result.status === 'failed') throw new ByodbOperationConflictError(result.operationId, result.status, current.externalId);
    if (result.status !== 'pending' && result.status !== 'processing') throw new Error('BYODB_OPERATION_STATUS_INVALID');
    throw new ByodbOperationPendingError(result.operationId, result.status, current.externalId);
  }
}

export class ModeAwareRepository implements ICRMRepository {
  private activeMode: StorageMode = 'cloud';
  readonly fallback: ICRMRepository;
  readonly byodb: ByodbRepository;

  constructor(fallback: ICRMRepository, options?: ByodbRepositoryOptions) { this.fallback = fallback; this.byodb = new ByodbRepository(fallback, options); }
  get mode(): StorageMode { return this.activeMode; }
  async repository(companyId: string): Promise<'cloud' | 'byodb'> {
    const context = await this.byodb.getContext(companyId);
    this.activeMode = context.mode === 'byodb' ? 'byodb' : 'cloud';
    return this.activeMode;
  }
  async getHealthStatus() { return this.fallback.getHealthStatus(); }
  async getLeads(orgId: string) { return await this.repository(orgId) === 'byodb' ? this.byodb.getLeads(orgId) : this.fallback.getLeads(orgId); }
  async saveLead(orgId: string, lead: Partial<Lead>) { return await this.repository(orgId) === 'byodb' ? this.byodb.saveLead(orgId, lead) : this.fallback.saveLead(orgId, lead); }
  async updateLeadStatus(orgId: string, leadId: string, status: string) { return await this.repository(orgId) === 'byodb' ? this.byodb.updateLeadStatus(orgId, leadId, status) : this.fallback.updateLeadStatus(orgId, leadId, status); }
  async deleteLead(orgId: string, leadId: string) { return await this.repository(orgId) === 'byodb' ? this.byodb.deleteLead(orgId, leadId) : this.fallback.deleteLead(orgId, leadId); }
  async getLeadNotes(orgId: string, leadId: string) { return this.fallback.getLeadNotes(orgId, leadId); }
  async addLeadNote(orgId: string, leadId: string, body: string) { return this.fallback.addLeadNote(orgId, leadId, body); }
  async deleteLeadNote(orgId: string, noteId: string) { return this.fallback.deleteLeadNote(orgId, noteId); }
  async getLeadFiles(orgId: string, leadId: string) { return this.fallback.getLeadFiles(orgId, leadId); }
  async uploadLeadFile(orgId: string, leadId: string, file: File) { return this.fallback.uploadLeadFile(orgId, leadId, file); }
  async deleteLeadFile(orgId: string, file: LeadStoredFile) { return this.fallback.deleteLeadFile(orgId, file); }
  async getEmployees(orgId: string) { return this.fallback.getEmployees(orgId); }
  async saveEmployee(orgId: string, employee: Partial<Employee>) { return this.fallback.saveEmployee(orgId, employee); }
  async getProjects(orgId: string) { return this.fallback.getProjects(orgId); }
  async saveProject(orgId: string, project: unknown) { return this.fallback.saveProject(orgId, project); }
  async getBranding(orgId: string) { return await this.repository(orgId) === 'byodb' ? this.byodb.getBranding(orgId) : this.fallback.getBranding(orgId); }
  async saveBranding(orgId: string, branding: CompanyBranding) { return await this.repository(orgId) === 'byodb' ? this.byodb.saveBranding(orgId, branding) : this.fallback.saveBranding(orgId, branding); }
}
