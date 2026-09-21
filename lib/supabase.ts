import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
}

// Well-known Demo Tenant IDs
export const DEFAULT_DEMO_ORG_ID = '11111111-2222-4333-8444-444444444444'; // Pergoly & Terasy Praha
export const IDEAL_DEMO_ORG_ID = '22222222-3333-4444-8555-555555555555';   // Ideal Konstrukce
export const NOVAK_DEMO_ORG_ID = '33333333-4444-4555-8666-666666666666';   // Novák Stavby

// Fallback in-memory and LocalStorage database representation
// Guarantees zero runtime crashes and authentic multi-tenant isolation
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
        website: 'https://pergoly-praha.cz',
        phone: '+420 774 889 100',
        email: 'info@pergoly-praha.cz',
        city: 'Praha a Středočeský kraj',
        address: 'Průmyslová 1420, Praha 10',
        primary_color: '#2563eb',
        secondary_color: '#0f172a',
        accent_color: '#06b6d4',
        theme_style: 'modern_pergolas',
        plan: 'enterprise',
        logo_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80',
        hero_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        status: 'Active',
        created_at: new Date('2026-01-15').toISOString()
      },
      {
        id: IDEAL_DEMO_ORG_ID,
        name: 'Ideal Konstrukce s.r.o.',
        slug: 'ideal-konstrukce',
        website: 'https://idealkonstrukce.cz',
        phone: '+420 541 234 567',
        email: 'kontakt@idealkonstrukce.cz',
        city: 'Brno a Jižní Morava',
        address: 'Vídeňská 125, 619 00 Brno',
        primary_color: '#0284c7',
        secondary_color: '#1e293b',
        accent_color: '#38bdf8',
        theme_style: 'industrial_roofing',
        plan: 'professional',
        logo_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f2?auto=format&fit=crop&w=160&q=80',
        hero_image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
        status: 'Active',
        created_at: new Date('2026-02-10').toISOString()
      },
      {
        id: NOVAK_DEMO_ORG_ID,
        name: 'Novák Stavby & Dřevostavby',
        slug: 'novak-stavby',
        website: 'https://novakstavby.cz',
        phone: '+420 777 123 456',
        email: 'info@novakstavby.cz',
        city: 'Třinec, Ostrava a Beskydy',
        address: 'Průmyslová 452, 739 61 Třinec',
        primary_color: '#d97706',
        secondary_color: '#78350f',
        accent_color: '#f59e0b',
        theme_style: 'wood_houses',
        plan: 'professional',
        logo_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=160&q=80',
        hero_image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        status: 'Active',
        created_at: new Date('2026-03-01').toISOString()
      }
    ]);
  }

  static saveOrganizations(orgs: any[]) {
    this.setStored('organizations', orgs);
  }

  static getCompanySettings(orgId?: string) {
    const defaultSettings = [
      {
        id: 'settings-pergoly',
        organization_id: DEFAULT_DEMO_ORG_ID,
        branding: {
          name: 'Pergoly & Terasy Praha s.r.o.',
          primaryColor: '#2563eb',
          secondaryColor: '#0f172a',
          accentColor: '#06b6d4',
          logoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=160&q=80',
          phone: '+420 774 889 100',
          email: 'info@pergoly-praha.cz',
          city: 'Praha a Středočeský kraj',
          address: 'Průmyslová 1420, Praha 10',
          services: ['Bioklimatické pergoly', 'Zasklení teras', 'Hliníkové přístřešky na auta', 'Screenové rolety'],
          website: 'https://pergoly-praha.cz'
        },
        services: ['Bioklimatické pergoly', 'Zasklení teras', 'Hliníkové přístřešky na auta', 'Screenové rolety'],
        website: 'https://pergoly-praha.cz',
        address: 'Průmyslová 1420, Praha 10',
        phone: '+420 774 889 100',
        email: 'info@pergoly-praha.cz',
        theme_style: 'modern_pergolas',
        created_at: new Date('2026-01-15').toISOString()
      },
      {
        id: 'settings-ideal',
        organization_id: IDEAL_DEMO_ORG_ID,
        branding: {
          name: 'Ideal Konstrukce s.r.o.',
          primaryColor: '#0284c7',
          secondaryColor: '#1e293b',
          accentColor: '#38bdf8',
          logoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f2?auto=format&fit=crop&w=160&q=80',
          phone: '+420 541 234 567',
          email: 'kontakt@idealkonstrukce.cz',
          city: 'Brno a Jižní Morava',
          address: 'Vídeňská 125, 619 00 Brno',
          services: ['Ocelové konstrukce a haly', 'Průmyslové střechy a opláštění', 'Zámečnické práce na míru'],
          website: 'https://idealkonstrukce.cz'
        },
        services: ['Ocelové konstrukce a haly', 'Průmyslové střechy a opláštění', 'Zámečnické práce na míru'],
        website: 'https://idealkonstrukce.cz',
        address: 'Vídeňská 125, 619 00 Brno',
        phone: '+420 541 234 567',
        email: 'kontakt@idealkonstrukce.cz',
        theme_style: 'industrial_roofing',
        created_at: new Date('2026-02-10').toISOString()
      },
      {
        id: 'settings-novak',
        organization_id: NOVAK_DEMO_ORG_ID,
        branding: {
          name: 'Novák Stavby & Dřevostavby',
          primaryColor: '#d97706',
          secondaryColor: '#78350f',
          accentColor: '#f59e0b',
          logoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=160&q=80',
          phone: '+420 777 123 456',
          email: 'info@novakstavby.cz',
          city: 'Třinec, Ostrava a Beskydy',
          address: 'Průmyslová 452, 739 61 Třinec',
          services: ['Dřevostavby na klíč', 'Sruby a roubenky', 'Krovy a tesařské konstrukce', 'Dřevěné fasády'],
          website: 'https://novakstavby.cz'
        },
        services: ['Dřevostavby na klíč', 'Sruby a roubenky', 'Krovy a tesařské konstrukce', 'Dřevěné fasády'],
        website: 'https://novakstavby.cz',
        address: 'Průmyslová 452, 739 61 Třinec',
        phone: '+420 777 123 456',
        email: 'info@novakstavby.cz',
        theme_style: 'wood_houses',
        created_at: new Date('2026-03-01').toISOString()
      }
    ];

    const all = this.getStored('company_settings', defaultSettings);
    if (orgId) {
      return all.find((s: any) => s.organization_id === orgId) || null;
    }
    return all;
  }

  static saveCompanySettings(settings: any[]) {
    this.setStored('company_settings', settings);
  }

  static getUsers() {
    const defaultUsers = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        organization_id: DEFAULT_DEMO_ORG_ID,
        role: 'super_admin',
        email: 'svobonek@gmail.com',
        password: 'AP11hynek',
        name: 'Jan Svoboda'
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        organization_id: DEFAULT_DEMO_ORG_ID,
        role: 'owner',
        email: 'majitel@firma.cz',
        password: 'demo123',
        name: 'Majitel Pergoly Praha'
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: DEFAULT_DEMO_ORG_ID,
        role: 'employee',
        email: 'zamestnanec@firma.cz',
        password: 'zam123',
        name: 'Petr Novotný (Mistr)'
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        organization_id: IDEAL_DEMO_ORG_ID,
        role: 'owner',
        email: 'majitel@idealkonstrukce.cz',
        password: 'demo123',
        name: 'Ing. Marek Dvořák (Ideal)'
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        organization_id: NOVAK_DEMO_ORG_ID,
        role: 'owner',
        email: 'majitel@novakstavby.cz',
        password: 'demo123',
        name: 'Josef Novák (Novák Stavby)'
      }
    ];

    const stored = this.getStored('users', defaultUsers);
    return stored.map((u: any) => ({
      ...u,
      role: u.role || 'owner'
    }));
  }

  static saveUsers(users: any[]) {
    this.setStored('users', users);
  }

  static getActiveOrgId(): string | null {
    try {
      return localStorage.getItem('active_org_id') || DEFAULT_DEMO_ORG_ID;
    } catch {
      return DEFAULT_DEMO_ORG_ID;
    }
  }

  static setActiveOrgId(orgId: string): void {
    try {
      localStorage.setItem('active_org_id', orgId);
      localStorage.setItem('has_deployed_company', 'true');
    } catch (e) {
      console.warn('Failed to save active_org_id', e);
    }
  }

  static getActiveSessionUser(): any | null {
    try {
      const stored = localStorage.getItem('mock_active_session_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static setActiveSessionUser(user: any): void {
    try {
      localStorage.setItem('mock_active_session_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to save session user', e);
    }
  }

  static getEmployees(orgId?: string) {
    const all = this.getStored('employees', [
      // Pergoly & Terasy Praha
      {
        id: 'emp-1',
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: 'Petr Novotný',
        phone: '+420 774 111 222',
        email: 'petr.novotny@pergoly-praha.cz',
        specialization: 'Bioklimatické pergoly & šéf montáží',
        role: 'Mistr',
        capacity: 90
      },
      {
        id: 'emp-2',
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: 'Martin Kovář',
        phone: '+420 774 222 333',
        email: 'martin.kovar@pergoly-praha.cz',
        specialization: 'Hliníkové konstrukce & zasklení teras',
        role: 'Montážník',
        capacity: 85
      },
      {
        id: 'emp-3',
        organization_id: DEFAULT_DEMO_ORG_ID,
        name: 'Lukáš Beran',
        phone: '+420 774 333 444',
        email: 'lukas.beran@pergoly-praha.cz',
        specialization: 'Elektroinstalace motorů Somfy & LED',
        role: 'Technik',
        capacity: 70
      },

      // Ideal Konstrukce s.r.o.
      {
        id: 'emp-ideal-1',
        organization_id: IDEAL_DEMO_ORG_ID,
        name: 'Ing. Tomáš Veleba',
        phone: '+420 541 777 888',
        email: 'veleba@idealkonstrukce.cz',
        specialization: 'Statika hal & projektování ocelových skeletů',
        role: 'Hlavní inženýr',
        capacity: 95
      },
      {
        id: 'emp-ideal-2',
        organization_id: IDEAL_DEMO_ORG_ID,
        name: 'Radek Malý',
        phone: '+420 541 888 999',
        email: 'maly@idealkonstrukce.cz',
        specialization: 'Certifikovaný svářeč & montér konstrukcí',
        role: 'Šéfparty',
        capacity: 80
      },
      {
        id: 'emp-ideal-3',
        organization_id: IDEAL_DEMO_ORG_ID,
        name: 'Jiří Dvořák',
        phone: '+420 541 999 000',
        email: 'dvorak@idealkonstrukce.cz',
        specialization: 'Stavbyvedoucí průmyslových objektů',
        role: 'Stavbyvedoucí',
        capacity: 75
      },

      // Novák Stavby & Dřevostavby
      {
        id: 'emp-novak-1',
        organization_id: NOVAK_DEMO_ORG_ID,
        name: 'Josef Novák',
        phone: '+420 777 444 555',
        email: 'josef@novakstavby.cz',
        specialization: 'Mistr tesař & roubené stavby',
        role: 'Mistr tesař',
        capacity: 95
      },
      {
        id: 'emp-novak-2',
        organization_id: NOVAK_DEMO_ORG_ID,
        name: 'David Stříbrný',
        phone: '+420 777 555 666',
        email: 'david@novakstavby.cz',
        specialization: 'Montáž dřevostaveb na klíč & krovů',
        role: 'Tesař',
        capacity: 85
      },
      {
        id: 'emp-novak-3',
        organization_id: NOVAK_DEMO_ORG_ID,
        name: 'Filip Kašpar',
        phone: '+420 777 666 777',
        email: 'filip@novakstavby.cz',
        specialization: 'Truhlářské práce & dřevěné obklady',
        role: 'Truhlář',
        capacity: 65
      }
    ]);

    if (orgId) {
      return all.filter((e: any) => e.organization_id === orgId);
    }
    return all;
  }

  static saveEmployees(emps: any[]) {
    this.setStored('employees', emps);
  }

  static getLeads(orgId?: string) {
    const all = this.getStored('leads', [
      // Pergoly Praha Leads
      {
        id: 'lead-1',
        organization_id: DEFAULT_DEMO_ORG_ID,
        customer_name: 'Ing. Jan Svoboda',
        customerName: 'Ing. Jan Svoboda',
        phone: '+420 603 456 789',
        customerPhone: '+420 603 456 789',
        email: 'svoboda.jan@seznam.cz',
        customerEmail: 'svoboda.jan@seznam.cz',
        title: 'Moderní bioklimatická pergola 6x4m - Praha 6',
        description: 'Poptávka na bioklimatickou pergolu s otočnými lamelami, LED osvětlením a větrným senzorem.',
        city: 'Praha 6 - Dejvice',
        address: 'Zahradní 12, Praha 6',
        project_type: 'Bioklimatické pergoly',
        price: 265000,
        budget: 265000,
        status: 'New',
        priority: 'High',
        assignedEmployeeId: 'emp-1',
        assignedEmployeeName: 'Petr Novotný',
        thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
        created_at: new Date('2026-09-08T14:15:00').toISOString()
      },
      {
        id: 'lead-2',
        organization_id: DEFAULT_DEMO_ORG_ID,
        customer_name: 'Marta Dvořáková',
        customerName: 'Marta Dvořáková',
        phone: '+420 732 998 877',
        customerPhone: '+420 732 998 877',
        email: 'm.dvorakova@gmail.com',
        customerEmail: 'm.dvorakova@gmail.com',
        title: 'Bezrámové zasklení terasy - Černošice',
        description: 'Kompletní posuvné zasklení terasy rodinného domu pro celoroční užívání.',
        city: 'Černošice u Prahy',
        address: 'V Rohu 45, Černošice',
        project_type: 'Zasklení teras',
        price: 195000,
        budget: 195000,
        status: 'Quote',
        priority: 'Medium',
        assignedEmployeeId: 'emp-2',
        assignedEmployeeName: 'Martin Kovář',
        thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
        created_at: new Date('2026-09-09T10:00:00').toISOString()
      },
      {
        id: 'lead-3',
        organization_id: DEFAULT_DEMO_ORG_ID,
        customer_name: 'Pavel Říha',
        customerName: 'Pavel Říha',
        phone: '+420 721 112 233',
        customerPhone: '+420 721 112 233',
        email: 'riha.p@volny.cz',
        customerEmail: 'riha.p@volny.cz',
        title: 'Designový hliníkový přístřešek na 2 auta - Průhonice',
        description: 'Příprava na montáž carportu s přípravou pro wallbox dobíjecí stanici.',
        city: 'Průhonice',
        address: 'Slunečná 8, Průhonice',
        project_type: 'Hliníkové přístřešky na auta',
        price: 310000,
        budget: 310000,
        status: 'In Progress',
        priority: 'Urgent',
        assignedEmployeeId: 'emp-3',
        assignedEmployeeName: 'Lukáš Beran',
        thumbnail: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        created_at: new Date('2026-09-07T09:30:00').toISOString()
      },

      // Ideal Konstrukce Leads
      {
        id: 'lead-ideal-1',
        organization_id: IDEAL_DEMO_ORG_ID,
        customer_name: 'Vojtěch Král (Logis s.r.o.)',
        customerName: 'Vojtěch Král (Logis s.r.o.)',
        phone: '+420 541 123 789',
        customerPhone: '+420 541 123 789',
        email: 'kral@logisbrno.cz',
        customerEmail: 'kral@logisbrno.cz',
        title: 'Ocelová skladová hala 450 m² - Modřice',
        description: 'Poptávka na nosnou ocelovou konstrukci a sendvičové PIR panely včetně průmyslových vrat.',
        city: 'Modřice u Brna',
        address: 'Průmyslová zóna Jih 4, Modřice',
        project_type: 'Ocelové konstrukce a haly',
        price: 1480000,
        budget: 1480000,
        status: 'New',
        priority: 'High',
        assignedEmployeeId: 'emp-ideal-1',
        assignedEmployeeName: 'Ing. Tomáš Veleba',
        thumbnail: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80',
        created_at: new Date('2026-09-10T08:00:00').toISOString()
      },
      {
        id: 'lead-ideal-2',
        organization_id: IDEAL_DEMO_ORG_ID,
        customer_name: 'Ing. Stanislav Beneš',
        customerName: 'Ing. Stanislav Beneš',
        phone: '+420 602 333 444',
        customerPhone: '+420 602 333 444',
        email: 'benes@agro-slavkov.cz',
        customerEmail: 'benes@agro-slavkov.cz',
        title: 'Výměna trapézového pláště výrobní haly - Slavkov',
        description: 'Sanace nosných ocelových vazníků a montáž nového zatepleného pláště.',
        city: 'Slavkov u Brna',
        address: 'Tovární 12, Slavkov',
        project_type: 'Průmyslové střechy a opláštění',
        price: 620000,
        budget: 620000,
        status: 'Contacted',
        priority: 'Medium',
        assignedEmployeeId: 'emp-ideal-2',
        assignedEmployeeName: 'Radek Malý',
        thumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f2?auto=format&fit=crop&w=600&q=80',
        created_at: new Date('2026-09-09T15:20:00').toISOString()
      },

      // Novák Stavby Leads
      {
        id: 'lead-novak-1',
        organization_id: NOVAK_DEMO_ORG_ID,
        customer_name: 'MUDr. Robert Procházka',
        customerName: 'MUDr. Robert Procházka',
        phone: '+420 777 999 888',
        customerPhone: '+420 777 999 888',
        email: 'prochazka.r@volny.cz',
        customerEmail: 'prochazka.r@volny.cz',
        title: 'Srubový rekreační dům na klíč - Čeladná',
        description: 'Zakázková stavba z lepených hranolů s difuzně otevřenou konstrukcí v Beskydech.',
        city: 'Čeladná (Beskydy)',
        address: 'Pod Smrkem 88, Čeladná',
        project_type: 'Sruby a roubenky',
        price: 3850000,
        budget: 3850000,
        status: 'Quote',
        priority: 'High',
        assignedEmployeeId: 'emp-novak-1',
        assignedEmployeeName: 'Josef Novák',
        thumbnail: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
        created_at: new Date('2026-09-06T11:15:00').toISOString()
      },
      {
        id: 'lead-novak-2',
        organization_id: NOVAK_DEMO_ORG_ID,
        customer_name: 'Helena Sýkorová',
        customerName: 'Helena Sýkorová',
        phone: '+420 776 555 444',
        customerPhone: '+420 776 555 444',
        email: 'sykorova.h@seznam.cz',
        customerEmail: 'sykorova.h@seznam.cz',
        title: 'Dřevěná terasa s pergolou ze severského modřínu - Ostravice',
        description: 'Montáž terasového plata 50 m² a návazné tesařské pergoly.',
        city: 'Ostravice',
        address: 'Údolní 105, Ostravice',
        project_type: 'Krovy a tesařské konstrukce',
        price: 280000,
        budget: 280000,
        status: 'In Progress',
        priority: 'Medium',
        assignedEmployeeId: 'emp-novak-2',
        assignedEmployeeName: 'David Stříbrný',
        thumbnail: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
        created_at: new Date('2026-09-08T16:45:00').toISOString()
      }
    ]);

    if (orgId) {
      return all.filter((l: any) => l.organization_id === orgId);
    }
    return all;
  }

  static saveLeads(leads: any[]) {
    this.setStored('leads', leads);
  }

  static getProjects(orgId?: string) {
    const all = this.getStored('projects', [
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
      },
      {
        id: 'proj-ideal-1',
        organization_id: IDEAL_DEMO_ORG_ID,
        lead_id: 'lead-ideal-1',
        assigned_employee: 'emp-ideal-1',
        status: 'in_progress'
      },
      {
        id: 'proj-novak-1',
        organization_id: NOVAK_DEMO_ORG_ID,
        lead_id: 'lead-novak-1',
        assigned_employee: 'emp-novak-1',
        status: 'in_progress'
      }
    ]);

    if (orgId) {
      return all.filter((p: any) => p.organization_id === orgId);
    }
    return all;
  }

  static saveProjects(projects: any[]) {
    this.setStored('projects', projects);
  }

  static getNotifications(orgId?: string) {
    const all = this.getStored('notifications', [
      {
        id: 'notif-1',
        organization_id: DEFAULT_DEMO_ORG_ID,
        title: 'Nová poptávka z webu',
        message: 'Ing. Jan Svoboda odeslal poptávku na bioklimatickou pergolu.',
        timestamp: '14:15',
        read: false,
        type: 'lead'
      }
    ]);
    if (orgId) {
      return all.filter((n: any) => !n.organization_id || n.organization_id === orgId);
    }
    return all;
  }

  static saveNotification(orgId: string, notification: any) {
    const notifications = this.getNotifications();
    this.setStored('notifications', [{ ...notification, organization_id: orgId }, ...notifications]);
  }

  static getActivities(orgId?: string) {
    const all = this.getStored('activities', [
      {
        time: '14:15',
        text: 'Přijata nová poptávka: Bioklimatická pergola 6x4m - Praha 6 (265.000 Kč)',
        badgeColor: '#EDE9FE',
        textColor: '#5B21B6',
        organization_id: DEFAULT_DEMO_ORG_ID
      }
    ]);
    if (orgId) {
      return all.filter((a: any) => !a.organization_id || a.organization_id === orgId);
    }
    return all;
  }

  static saveActivity(orgId: string, activity: any) {
    const activities = this.getActivities();
    this.setStored('activities', [{ ...activity, organization_id: orgId }, ...activities]);
  }
}
