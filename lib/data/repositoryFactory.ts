import { ICRMRepository, StorageMode } from './types';
import { SupabaseRepository } from './SupabaseRepository';
import { SynologyLocalRepository } from './SynologyLocalRepository';

const STORAGE_MODE_KEY = 'crm_storage_mode_preference';
const SYNOLOGY_ENDPOINT_KEY = 'crm_synology_endpoint';
const SYNOLOGY_TOKEN_KEY = 'crm_synology_token';

class RepositoryManager {
  private currentMode: StorageMode;
  private supabaseRepo: SupabaseRepository;
  private synologyRepo: SynologyLocalRepository;
  private listeners: Set<(mode: StorageMode) => void> = new Set();

  constructor() {
    // Read preference or environment variable
    const envMode = (import.meta as any).env?.VITE_STORAGE_MODE as StorageMode;
    const savedMode = typeof localStorage !== 'undefined' 
      ? (localStorage.getItem(STORAGE_MODE_KEY) as StorageMode)
      : null;

    this.currentMode = savedMode || envMode || 'cloud';

    const savedEndpoint = typeof localStorage !== 'undefined' 
      ? localStorage.getItem(SYNOLOGY_ENDPOINT_KEY)
      : null;
    const savedToken = typeof localStorage !== 'undefined' 
      ? localStorage.getItem(SYNOLOGY_TOKEN_KEY)
      : null;

    this.supabaseRepo = new SupabaseRepository();
    this.synologyRepo = new SynologyLocalRepository(
      savedEndpoint || (import.meta as any).env?.VITE_SYNOLOGY_ENDPOINT,
      savedToken || (import.meta as any).env?.VITE_SYNOLOGY_TOKEN
    );
  }

  getRepository(): ICRMRepository {
    if (this.currentMode === 'synology') {
      return this.synologyRepo;
    }
    return this.supabaseRepo;
  }

  getMode(): StorageMode {
    return this.currentMode;
  }

  setMode(mode: StorageMode, synologyConfig?: { endpoint?: string; token?: string }) {
    this.currentMode = mode;
    try {
      localStorage.setItem(STORAGE_MODE_KEY, mode);
      if (synologyConfig?.endpoint) {
        localStorage.setItem(SYNOLOGY_ENDPOINT_KEY, synologyConfig.endpoint);
        this.synologyRepo.setEndpoint(synologyConfig.endpoint, synologyConfig.token);
      }
      if (synologyConfig?.token) {
        localStorage.setItem(SYNOLOGY_TOKEN_KEY, synologyConfig.token);
      }
    } catch (e) {
      console.warn('LocalStorage mode save failed', e);
    }

    this.listeners.forEach((fn) => fn(mode));
  }

  subscribe(listener: (mode: StorageMode) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSynologyRepo(): SynologyLocalRepository {
    return this.synologyRepo;
  }
}

export const repositoryManager = new RepositoryManager();
export const crmRepo = new Proxy({} as ICRMRepository, {
  get(_target, prop) {
    const active = repositoryManager.getRepository();
    const val = (active as any)[prop];
    return typeof val === 'function' ? val.bind(active) : val;
  }
});
