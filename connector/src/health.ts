import { createServer, type Server } from 'node:http';

export type ConnectorHealthStatus = 'starting' | 'ready' | 'paused';

export interface ConnectorHealthSnapshot {
  status: ConnectorHealthStatus;
  version: string;
  configured: boolean;
  paused: boolean;
  lastHeartbeatAt: string | null;
}

export class ConnectorHealth {
  private configured = false;
  private paused = false;
  private lastHeartbeatAt: string | null = null;

  constructor(private readonly version: string) {}

  setConfigured(configured: boolean): void {
    this.configured = configured;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  recordHeartbeat(at = new Date()): void {
    this.lastHeartbeatAt = at.toISOString();
  }

  ready(): boolean {
    return this.configured && !this.paused && this.lastHeartbeatAt !== null;
  }

  containerHealthy(): boolean {
    return this.configured && this.lastHeartbeatAt !== null;
  }

  snapshot(): ConnectorHealthSnapshot {
    return {
      status: this.paused ? 'paused' : this.ready() ? 'ready' : 'starting',
      version: this.version,
      configured: this.configured,
      paused: this.paused,
      lastHeartbeatAt: this.lastHeartbeatAt,
    };
  }
}

export interface HealthServerOptions {
  host?: string;
  port?: number;
}

export class HealthServer {
  readonly rawServer: Server;
  private readonly host: string;
  private readonly port: number;

  constructor(private readonly health: ConnectorHealth, options: HealthServerOptions = {}) {
    this.host = options.host ?? '0.0.0.0';
    this.port = options.port ?? 8787;
    this.rawServer = createServer((request, response) => {
      if (request.method !== 'GET' || request.url !== '/health') {
        response.writeHead(404, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        response.end('{"code":"NOT_FOUND"}');
        return;
      }
      const snapshot = this.health.snapshot();
      response.writeHead(this.health.containerHealthy() ? 200 : 503, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      });
      response.end(JSON.stringify(snapshot));
    });
  }

  async start(): Promise<void> {
    if (this.rawServer.listening) return;
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        this.rawServer.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        this.rawServer.off('error', onError);
        resolve();
      };
      this.rawServer.once('error', onError);
      this.rawServer.once('listening', onListening);
      this.rawServer.listen(this.port, this.host);
    });
  }

  async close(): Promise<void> {
    if (!this.rawServer.listening) return;
    await new Promise<void>((resolve, reject) => this.rawServer.close(error => error ? reject(error) : resolve()));
  }
}
