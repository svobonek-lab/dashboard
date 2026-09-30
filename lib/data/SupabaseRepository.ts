import { ICRMRepository, RepositoryHealthStatus } from './types';
import { Lead, Employee, CompanyBranding } from '../../types';
import { supabase, isSupabaseConfigured, isValidUUID, LocalSupabaseMock } from '../supabase';

export class SupabaseRepository implements ICRMRepository {
  readonly mode = 'cloud' as const;

  async getHealthStatus(): Promise<RepositoryHealthStatus> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        ok: true,
        latencyMs: 0,
        mode: 'local',
        endpoint: 'Client-side Local Mock Engine',
        message: 'Běží v offline / lokálním režimu (Supabase klíč nenastaven)',
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
      };
    }

    const start = performance.now();
    try {
      // Ping Supabase with a lightweight query
      const { error } = await supabase.from('app_companies').select('id').limit(1);
      const latencyMs = Math.round(performance.now() - start);

      if (error && error.code !== 'PGRST116') {
        return {
          ok: false,
          latencyMs,
          mode: 'cloud',
          endpoint: 'Supabase Cloud',
          message: error.message,
          lastChecked: new Date().toLocaleTimeString('cs-CZ'),
        };
      }

      return {
        ok: true,
        latencyMs,
        mode: 'cloud',
        endpoint: 'Supabase Cloud (PostgreSQL)',
        message: `Aktivní cloudové spojení (${latencyMs}ms)`,
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs,
        mode: 'cloud',
        endpoint: 'Supabase Cloud',
        message: err.message || 'Chyba síťového spojení s cloudem',
        lastChecked: new Date().toLocaleTimeString('cs-CZ'),
      };
    }
  }

  async getLeads(orgId: string): Promise<Lead[]> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      const raw = LocalSupabaseMock.getLeads();
      return raw.map((r: any) => ({
        id: r.id,
        title: `${r.project_type || 'Zakázka'} — ${r.customer_name || 'Neznámý'}`,
        description: r.description || `Poptávka na ${r.project_type || 'služby'}`,
        city: r.city || 'Praha',
        address: r.address || 'Praha a okolí',
        customerName: r.customer_name || '',
        customerPhone: r.phone || '',
        customerEmail: r.email || '',
        preferredDate: 'Dle dohody',
        price: r.budget || r.price || 0,
        status: (r.status as any) || 'New',
        priority: 'Medium',
        assignedEmployeeId: 'emp-1',
        assignedEmployeeName: 'Petr Novotný',
        thumbnail: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
        photos: [],
        files: [],
        checklist: [],
        aiSummary: {
          jobType: r.project_type || 'Realizace',
          complexity: 'Medium',
          estimatedRange: (r.budget || r.price) ? `${((r.budget || r.price) * 0.9 / 1000).toFixed(0)}k - ${((r.budget || r.price) * 1.15 / 1000).toFixed(0)}k CZK` : 'Cena není uvedena',
          assignedEmployee: 'Petr Novotný',
          risks: [],
          recommendedNextStep: 'Zkontaktovat klienta a upřesnit zaměření.'
        },
        timeline: [],
        aiChat: [],
        history: []
      }));
    }

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getLeads error, using fallback:', error.message);
        return [];
      }

      return (data || []).map((r: any) => ({
        id: r.id,
        title: r.title || `${r.project_type || 'Zakázka'} — ${r.customer_name || 'Klient'}`,
        description: r.description || '',
        city: r.city || 'Praha',
        address: r.address || '',
        customerName: r.customer_name || '',
        customerPhone: r.phone || '',
        customerEmail: r.email || '',
        preferredDate: r.preferred_date || 'Dle dohody',
        price: r.budget || r.price || 0,
        status: r.status || 'New',
        priority: r.priority || 'Medium',
        assignedEmployeeId: r.assigned_employee_id || 'emp-1',
        assignedEmployeeName: r.assigned_employee_name || 'Petr Novotný',
        thumbnail: r.thumbnail || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
        photos: r.photos || [],
        files: r.files || [],
        checklist: r.checklist || [],
        aiSummary: r.ai_summary || {
          jobType: r.project_type || 'Projekt',
          complexity: 'Medium',
          estimatedRange: 'Dle kalkulace',
          assignedEmployee: 'Petr Novotný',
          risks: [],
          recommendedNextStep: 'Telefonický kontakt.'
        },
        timeline: r.timeline || [],
        aiChat: r.ai_chat || [],
        history: r.history || []
      }));
    } catch (err) {
      console.error('Supabase fetch failed:', err);
      return [];
    }
  }

  async saveLead(orgId: string, lead: Partial<Lead>): Promise<Lead> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      return lead as Lead;
    }

    try {
      const payload: any = {
        organization_id: orgId,
        customer_name: lead.customerName,
        phone: lead.customerPhone,
        email: lead.customerEmail,
        project_type: lead.aiSummary?.jobType || lead.title?.split('—')[0]?.trim() || 'Zakázka',
        budget: lead.price,
        status: lead.status || 'New',
        title: lead.title,
        description: lead.description,
        city: lead.city,
        address: lead.address,
        preferred_date: lead.preferredDate,
        priority: lead.priority,
        assigned_employee_id: lead.assignedEmployeeId,
        assigned_employee_name: lead.assignedEmployeeName,
        thumbnail: lead.thumbnail,
        photos: lead.photos || [],
        files: lead.files || [],
        checklist: lead.checklist || [],
        ai_summary: lead.aiSummary,
        timeline: lead.timeline || [],
        ai_chat: lead.aiChat || [],
        history: lead.history || [],
        voice_notes: lead.voiceNotes || []
      };

      if (isValidUUID(lead.id)) {
        payload.id = lead.id;
      }

      const { data, error } = await supabase
        .from('leads')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        console.warn('Supabase saveLead upsert warning:', error.message);
        return lead as Lead;
      }

      return {
        ...lead,
        id: data?.id || lead.id,
      } as Lead;
    } catch (err) {
      console.warn('saveLead exception, using local:', err);
      return lead as Lead;
    }
  }

  async updateLeadStatus(orgId: string, leadId: string, status: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId) || !isValidUUID(leadId)) {
      return;
    }

    await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId)
      .eq('organization_id', orgId);
  }

  async deleteLead(orgId: string, leadId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(leadId)) return;
    await supabase.from('leads').delete().eq('id', leadId);
  }

  async getEmployees(orgId: string): Promise<Employee[]> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      return LocalSupabaseMock.getEmployees() as any;
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', orgId);

    if (error || !data) {
      return LocalSupabaseMock.getEmployees() as any;
    }

    return data.map((e: any) => ({
      id: e.id,
      name: e.name || 'Pracovník',
      avatar: e.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(e.name || 'tech')}`,
      specialization: e.specialization || 'Tesařské práce',
      capacity: e.capacity ?? 80,
      maxCapacity: 100,
      todaysJobsCount: 2,
      status: e.capacity > 90 ? 'Red' : e.capacity > 70 ? 'Orange' : 'Green',
      phone: e.phone || '+420 600 000 000',
      email: e.email || 'zamestnanec@firma.cz'
    }));
  }

  async saveEmployee(orgId: string, employee: Partial<Employee>): Promise<Employee> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      return employee as Employee;
    }

    const payload: any = {
      organization_id: orgId,
      name: employee.name,
      specialization: employee.specialization,
      capacity: employee.capacity || 80,
    };
    if (isValidUUID(employee.id)) payload.id = employee.id;

    const { data } = await supabase.from('employees').upsert(payload).select().single();
    return { ...employee, id: data?.id || employee.id } as Employee;
  }

  async getProjects(orgId: string): Promise<any[]> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      return LocalSupabaseMock.getProjects();
    }
    const { data } = await supabase.from('projects').select('*').eq('organization_id', orgId);
    return data || [];
  }

  async saveProject(orgId: string, project: any): Promise<any> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) return project;
    const { data } = await supabase.from('projects').upsert({ ...project, organization_id: orgId }).select().single();
    return data || project;
  }

  async getBranding(orgId: string): Promise<CompanyBranding> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      const orgs = LocalSupabaseMock.getOrganizations();
      const match = orgs.find((o: any) => o.id === orgId) || orgs[0];
      return {
        name: match?.name || 'Pergoly & Terasy Praha',
        primaryColor: match?.primary_color || '#2563eb',
        logoUrl: match?.logo_url,
        phone: '+420 603 456 789',
        email: 'info@pergoly-praha.cz',
        city: 'Praha',
        address: 'Vídeňská 120, Praha 4',
        services: ['Pergoly', 'Střechy', 'Terasy']
      };
    }

    const { data } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    return {
      name: data?.name || 'Pergoly & Terasy Praha',
      primaryColor: data?.primary_color || '#2563eb',
      logoUrl: data?.logo_url,
      phone: '+420 603 456 789',
      email: 'info@pergoly-praha.cz',
      city: 'Praha',
      address: 'Vídeňská 120, Praha 4',
      services: ['Pergoly', 'Střechy', 'Terasy']
    };
  }

  async saveBranding(orgId: string, branding: CompanyBranding): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) return;
    await supabase.from('organizations').update({
      name: branding.name,
      primary_color: branding.primaryColor,
      logo_url: branding.logoUrl
    }).eq('id', orgId);
  }
}
