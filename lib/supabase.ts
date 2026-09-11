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

// Fallback in-memory database representation with initial values
// to ensure perfect functionality and no crashes when Supabase is not configured yet
export class LocalSupabaseMock {
  private static getStored<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(`mock_supabase_${key}`);
      return stored ? JSON.parse(stored) : defaultValue;
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
        id: 'org-1111-2222-3333-444444444444',
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
        id: 'user-default-uid-123456789',
        organization_id: 'org-1111-2222-3333-444444444444',
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
        organization_id: 'org-1111-2222-3333-444444444444',
        name: 'Petr Novotný',
        specialization: 'Střechy & Tesařské práce',
        capacity: 85
      },
      {
        id: 'emp-2',
        organization_id: 'org-1111-2222-3333-444444444444',
        name: 'Martin Kovář',
        specialization: 'Pergoly & Hliníkové konstrukce',
        capacity: 95
      },
      {
        id: 'emp-3',
        organization_id: 'org-1111-2222-3333-444444444444',
        name: 'Tomáš Veselý',
        specialization: 'Fasády & Zateplování',
        capacity: 60
      },
      {
        id: 'emp-4',
        organization_id: 'org-1111-2222-3333-444444444444',
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
        organization_id: 'org-1111-2222-3333-444444444444',
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
        organization_id: 'org-1111-2222-3333-444444444444',
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
        organization_id: 'org-1111-2222-3333-444444444444',
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
        organization_id: 'org-1111-2222-3333-444444444444',
        lead_id: 'lead-1',
        assigned_employee: 'emp-1',
        status: 'in_progress'
      },
      {
        id: 'proj-2',
        organization_id: 'org-1111-2222-3333-444444444444',
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
