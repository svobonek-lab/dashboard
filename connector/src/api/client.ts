import { randomUUID } from 'node:crypto';

import type { ConnectorCommandV1, IngestAckV1, IngestEnvelopeV1 } from '../../../shared/connectorProtocol.js';
import { signRequest, type ConnectorIdentity } from '../security/identity.js';

export class ConnectorApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(`StavbaFlow connector request failed (${code})`);
    this.name = 'ConnectorApiError';
  }
}

export interface ConnectorApiOptions {
  baseUrl: string;
  connectorId?: string;
  identity: ConnectorIdentity;
  fetcher?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  maxBodyBytes?: number;
}

export class ConnectorApi {
  private readonly baseUrl: URL;
  private readonly fetcher: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly maxBodyBytes: number;

  constructor(private readonly options: ConnectorApiOptions) {
    this.baseUrl = new URL(options.baseUrl);
    if (this.baseUrl.protocol !== 'https:' && !(this.baseUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(this.baseUrl.hostname))) {
      throw new Error('connector API requires HTTPS');
    }
    if (this.baseUrl.username || this.baseUrl.password || this.baseUrl.search || this.baseUrl.hash) throw new Error('connector API URL must not contain credentials or query data');
    this.fetcher = options.fetcher ?? fetch;
    this.sleep = options.sleep ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)));
    this.maxBodyBytes = options.maxBodyBytes ?? 512 * 1024;
  }

  async enroll(enrollmentCode: string): Promise<{ connectorId: string }> {
    return this.request('/api/connector-register', { enrollmentCode, publicKey: this.options.identity.publicKey }, false);
  }

  async heartbeat(status: { status: string; version: string }): Promise<{ accepted: boolean }> {
    return this.request('/api/connector-heartbeat', status, true);
  }

  async ingest(envelope: IngestEnvelopeV1): Promise<IngestAckV1> {
    return this.request('/api/connector-ingest', envelope, true);
  }

  async pollCommands(now = new Date()): Promise<ConnectorCommandV1[]> {
    const result = await this.request<{ commands: ConnectorCommandV1[] }>('/api/connector-commands', { action: 'poll' }, true);
    return (result.commands ?? []).filter(command => command.connectorId === this.options.connectorId && new Date(command.expiresAt) > now);
  }

  async acknowledgeCommand(commandId: string): Promise<void> {
    await this.request('/api/connector-commands', { action: 'acknowledge', commandId }, true);
  }

  private async request<T = { accepted: boolean }>(pathname: string, payload: unknown, signed: boolean): Promise<T> {
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body, 'utf8') > this.maxBodyBytes) throw new Error('request body exceeds connector limit');
    let lastNetworkError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const timestamp = new Date().toISOString();
      const requestId = payload && typeof payload === 'object' && typeof (payload as { requestId?: unknown }).requestId === 'string'
        ? String((payload as { requestId: string }).requestId)
        : randomUUID();
      const headers = new Headers({ 'content-type': 'application/json' });
      if (signed) {
        if (!this.options.connectorId) throw new Error('connectorId is required for signed requests');
        const signature = signRequest(this.options.identity, { method: 'POST', pathname, timestamp, requestId, body });
        headers.set('x-sf-connector-id', this.options.connectorId);
        headers.set('x-sf-timestamp', timestamp);
        headers.set('x-sf-request-id', requestId);
        headers.set('x-sf-signature', signature.signature);
      }
      try {
        const response = await this.fetcher(new URL(pathname, this.baseUrl), { method: 'POST', headers, body, redirect: 'error' });
        const parsed = await response.json().catch(() => ({})) as { code?: unknown };
        if (response.ok) return parsed as T;
        const code = typeof parsed.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(parsed.code) ? parsed.code : 'CONNECTOR_REQUEST_FAILED';
        if ((response.status === 429 || response.status >= 500) && attempt < 3) {
          await this.sleep(250 * (2 ** (attempt - 1)));
          continue;
        }
        throw new ConnectorApiError(code, response.status);
      } catch (error) {
        if (error instanceof ConnectorApiError) throw error;
        lastNetworkError = error;
        if (attempt < 3) {
          await this.sleep(250 * (2 ** (attempt - 1)));
          continue;
        }
      }
    }
    throw new ConnectorApiError('CONNECTOR_NETWORK_UNAVAILABLE', 0);
  }
}
