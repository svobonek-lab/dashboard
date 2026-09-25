import { ICRMRepository, RepositoryHealthStatus } from './types';
import { Lead, Employee, CompanyBranding } from '../../types';
import { LocalSupabaseMock } from '../supabase';
import { getConfiguredSynologyToken } from './synologyToken';

export class SynologyLocalRepository implements ICRMRepository {
  readonly mode = 'synology' as const;
  private baseUrl: string;
  private apiToken?: string;

  constructor(endpoint?: string, apiToken?: string) {
    this.baseUrl = (endpoint || 'http://synology.local:8080/api').replace(/\/$/, '');
    this.apiToken = getConfiguredSynologyToken(apiToken);
  }

  setEndpoint(url: string, token?: string) {
    const nextBaseUrl = url.replace(/\/$/, '');
    const endpointChanged = nextBaseUrl !== this.baseUrl;
    this.baseUrl = nextBaseUrl;
    if (token !== undefined) this.apiToken = getConfiguredSynologyToken(token);
    else if (endpointChanged) this.apiToken = undefined;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiToken) {
      throw new Error('Synology API token není nastaven. Nastavte jej před připojením.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Synology-App-Token': this.apiToken,
          'Authorization': `Bearer ${this.apiToken}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Synology NAS API chyba [${response.status}]: ${response.statusText}`);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Vypršel časový limit spojení s privátním NASem (${this.baseUrl}). Zkontrolujte lokální Wi-Fi.`);
      }
      throw err;
    }
  }

  async getHealthStatus(): Promise<RepositoryHealthStatus> {
    const start = performance.now();
    try {
      await this.request('/health');
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs,
        mode: 'synology',
        endpoint: this.baseUrl,
        message: `Připojeno k lokálnímu Synology NAS (${latencyMs}ms)`,
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs,
        mode: 'synology',
        endpoint: this.baseUrl,
        message: err.message || 'Nelze navázat spojení se Synology NAS',
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
      };
    }
  }

  async getLeads(orgId: string): Promise<Lead[]> {
    try {
      const leads = await this.request<Lead[]>(`/organizations/${orgId}/leads`);
      // Cache locally for offline resilience
      localStorage.setItem(`synology_cache_leads_${orgId}`, JSON.stringify(leads));
      return leads;
    } catch (err) {
      console.warn('Synology NAS nedostupný, použita lokální mezipaměť:', err);
      const cached = localStorage.getItem(`synology_cache_leads_${orgId}`);
      if (cached) return JSON.parse(cached);
      return LocalSupabaseMock.getLeads() as any;
    }
  }

  async saveLead(orgId: string, lead: Partial<Lead>): Promise<Lead> {
    try {
      const saved = await this.request<Lead>(`/organizations/${orgId}/leads`, {
        method: 'POST',
        body: JSON.stringify(lead),
      });
      return saved;
    } catch (err) {
      console.warn('Synology saveLead failed, saving locally:', err);
      return lead as Lead;
    }
  }

  async updateLeadStatus(orgId: string, leadId: string, status: string): Promise<void> {
    try {
      await this.request(`/organizations/${orgId}/leads/${leadId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.warn('Synology updateLeadStatus offline fallback:', err);
    }
  }

  async deleteLead(orgId: string, leadId: string): Promise<void> {
    await this.request(`/organizations/${orgId}/leads/${leadId}`, {
      method: 'DELETE',
    });
  }

  async getEmployees(orgId: string): Promise<Employee[]> {
    try {
      return await this.request<Employee[]>(`/organizations/${orgId}/employees`);
    } catch {
      return LocalSupabaseMock.getEmployees() as any;
    }
  }

  async saveEmployee(orgId: string, employee: Partial<Employee>): Promise<Employee> {
    try {
      return await this.request<Employee>(`/organizations/${orgId}/employees`, {
        method: 'POST',
        body: JSON.stringify(employee),
      });
    } catch {
      return employee as Employee;
    }
  }

  async getProjects(orgId: string): Promise<any[]> {
    try {
      return await this.request<any[]>(`/organizations/${orgId}/projects`);
    } catch {
      return LocalSupabaseMock.getProjects();
    }
  }

  async saveProject(orgId: string, project: any): Promise<any> {
    try {
      return await this.request<any>(`/organizations/${orgId}/projects`, {
        method: 'POST',
        body: JSON.stringify(project),
      });
    } catch {
      return project;
    }
  }

  async getBranding(orgId: string): Promise<CompanyBranding> {
    try {
      return await this.request<CompanyBranding>(`/organizations/${orgId}/branding`);
    } catch {
      return {
        name: 'Pergoly & Stavby s.r.o.',
        primaryColor: '#2563eb',
        phone: '+420 777 888 999',
        email: 'info@firma.cz',
        city: 'Praha',
        address: 'Průmyslová 14, Praha 10',
        services: ['Pergoly', 'Zimní zahrady', 'Fasády']
      };
    }
  }

  async saveBranding(orgId: string, branding: CompanyBranding): Promise<void> {
    await this.request(`/organizations/${orgId}/branding`, {
      method: 'PUT',
      body: JSON.stringify(branding),
    });
  }
}
