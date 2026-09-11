import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export const DEFAULT_DEMO_ORG_ID = '11111111-2222-4333-8444-444444444444';

// Fallback in-memory database representation with initial values
// to ensure perfect functionality and no crashes when Supabase is not configured yet
export class LocalSupabaseMock {
  private static getStored<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`mock_supabase_${key}`);
      if (!stored) return defaultValue;
      let parsed = JSON.parse(stored);
      // Automatically sanitize legacy non-hex mock UUIDs like 'org-1111...'
      if (typeof parsed === 'object') {
        const str = JSON.stringify(parsed);
        if (str.includes('org-1111-2222-3333-444444444444')) {
          parsed = JSON.parse(str.replace(/org-1111-2222-3333-444444444444/g, DEFAULT_DEMO_ORG_ID));
          localStorage.setItem(`mock_supabase_${key}`, JSON.stringify(parsed));
        }
      }
      return parsed;
    } catch {
      return defaultValue;
    }
  }

  private static setStored<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`mock_supabase_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write failed', e);
    }
  }

  static getOrganizations() {
    return this.getStored('organizations', [
      {
        id: DEFAULT_DEMO_ORG_ID,
        name: 'Pergoly & Terasy Praha s.r.o.',
        slug: 'pergoly-praha',
        primary_color: '#2563eb',
        logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80',
        created_at: new Date().toISOString()
      }
    ]);
  }

  static saveOrganizations(orgs: any[]) {
    this.setStored('organizations', orgs);
  }

  static getUsers() {
    return this.getStored('users', [
      {
        id: '11111111-1111-4111-8111-111111111111',
        organization_id: DEFAULT_DEMO_ORG_ID,
        role: 'owner'
      }
    ]);
  }

  static saveUsers(users: any[]) {
    this.setStored('users', users);
  }

  static getEmployees() {
    return this.getStored('employees', [
      {
        id: 'emp-1',
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: 'Petr Novotný',
        specialization: 'Střechy & Tesařské práce',
        capacity: 85
      },
      {
        id: 'emp-2',
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: 'Martin Kovář',
        specialization: 'Pergoly & Hliníkové konstrukce',
        capacity: 95
      },
      {
        id: 'emp-3',
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: 'Tomáš Veselý',
        specialization: 'Fasády & Zateplování',
        capacity: 60
      },
      {
        id: 'emp-4',
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: 'Jan Richter',
        specialization: 'Rekonstrukce interiérů',
        capacity: 100
      }
    ]);
  }

  static saveEmployees(emps: any[]) {
    this.setStored('employees', emps);
  }

  static getLeads() {
    return this.getStored('leads', [
      {
        id: 'lead-1',
        organization_id: DEFAULT_DEMO_ORG_ID,
        customer_name: 'Ing. Jan Svoboda',
        phone: '+420 603 456 789',
        email: 'svoboda.jan@seznam.cz',
        project_type: 'Pergoly',
        budget: 220000,
        status: 'New',
        created_at: new Date().toISOString()
      },
      {
        id: 'lead-2',
        organization_id: DEFAULT_DEMO_ORG_ID,
        customer_name: 'Marta Dvořáková',
        phone: '+420 732 998 877',
        email: 'm.dvorakova@gmail.com',
        project_type: 'Střechy',
        budget: 480000,
        status: 'Contacted',
        created_at: new Date().toISOString()
      },
      {
        id: 'lead-3',
        organization_id: DEFAULT_DEMO_ORG_ID,
        customer_name: 'Pavel Říha',
        phone: '+420 721 112 233',
        email: 'riha.p@volny.cz',
        project_type: 'Rekonstrukce',
        budget: 310000,
        status: 'Quote',
        created_at: new Date().toISOString()
      }
    ]);
  }

  static saveLeads(leads: any[]) {
    this.setStored('leads', leads);
  }

  static getProjects() {
    return this.getStored('projects', [
      {
        id: 'proj-1',
        organization_id: DEFAULT_DEMO_ORG_ID,
        lead_id: 'lead-1',
        assigned_employee: 'emp-1',
        status: 'in_progress'
      },
      {
        id: 'proj-2',
        organization_id: DEFAULT_DEMO_ORG_ID,
        lead_id: 'lead-2',
        assigned_employee: 'emp-2',
        status: 'draft'
      }
    ]);
  }

  static saveProjects(projects: any[]) {
    this.setStored('projects', projects);
  }
}
