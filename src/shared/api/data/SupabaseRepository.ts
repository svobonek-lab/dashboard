import { ICRMRepository, LeadNote, LeadStoredFile, RepositoryHealthStatus } from './types';
import type { Lead, Employee, CompanyBranding } from './types';
import { supabase, isSupabaseConfigured, isValidUUID } from '../supabase';
import { AppInviteRow, AppLeadEventRow, AppLeadRow, AppLeadStatusAuditRow, AppMemberRow, toAppAuditLeadHistory, toAppLead, toAppLeadEventHistory, toAppMember, toPendingInvite } from '../productionSchema';
import { APP_SCHEMA_WRITES_BLOCKED_MESSAGE } from '../productionDataPolicy';
import { canWriteAppLeads } from '../pilotWritePolicy';
import { toLeadPatch } from './leadWritePatch';
import { requireLeadWriteResult } from './leadWriteResult';
import { buildLeadFilePath, normalizeLeadNote, validateLeadUpload } from './leadFilePolicy';
import { requireOneDeletedRow, resolveSignedPreviews, runLeadFileDelete, runLeadFileUpload } from './leadAttachmentOperations';

const appSchemaReadsEnabled = Boolean((import.meta as any).env?.PROD) || (import.meta as any).env?.VITE_APP_SCHEMA_READS === 'true';
const leadWriteEnv: Record<string, unknown> = import.meta.env || {};
const appLeadWritesEnabled = canWriteAppLeads(leadWriteEnv);

const appStatus: Record<string, AppLeadRow['status']> = {
  New: 'new', Contacted: 'contacted', Quote: 'scheduled', 'In Progress': 'in_progress', Completed: 'won', Lost: 'lost'
};
const appPriority: Record<string, AppLeadRow['priority']> = { Low: 'low', Medium: 'normal', High: 'high' };

export class SupabaseRepository implements ICRMRepository {
  readonly mode = 'cloud' as const;

  async getHealthStatus(): Promise<RepositoryHealthStatus> {
    if (!isSupabaseConfigured || !supabase) {
      return {
        ok: false,
        latencyMs: 0,
        mode: 'cloud',
        endpoint: 'Supabase Cloud',
        message: 'Supabase připojení není nakonfigurované.',
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
      throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    }

    try {
      if (appSchemaReadsEnabled) {
        const { data, error } = await supabase
          .from('app_leads')
          .select('id,company_id,title,customer,email,phone,address,description,status,priority,assigned_to,scheduled_at,duration_minutes,value,source,created_at,updated_at,revision')
          .eq('company_id', orgId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase app_leads read failed closed:', error.message);
          throw new Error('Poptávky se nepodařilo načíst. Zkuste obnovit připojení.');
        }

        let events: AppLeadEventRow[] = [];
        let legacyEvents: AppLeadStatusAuditRow[] = [];
        if (appLeadWritesEnabled && data?.length) {
          const history = await supabase.from('app_lead_events')
            .select('id,lead_id,actor_id,operation,old_status,new_status,old_assigned_to,new_assigned_to,created_at')
            .eq('company_id', orgId)
            .in('operation', ['INSERT', 'UPDATE', 'ASSIGNMENT', 'STATUS', 'DETAILS'])
            .order('created_at', { ascending: false });
          if (history.error) throw new Error('Historii zakázek se nepodařilo načíst.');
          events = (history.data || []) as AppLeadEventRow[];
        }
        if (appLeadWritesEnabled && data?.length
          && leadWriteEnv.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co') {
          const historyResult = await supabase.from('app_audit')
            .select('id,actor,action,entity_id,created_at')
            .eq('company_id', orgId)
            .eq('action', 'lead_status_changed')
            .order('created_at', { ascending: false });
          if (historyResult.error) throw new Error('Historii zakázek se nepodařilo načíst.');
          legacyEvents = (historyResult.data || []) as AppLeadStatusAuditRow[];
        }
        return ((data || []) as AppLeadRow[]).map((row) => ({
          ...toAppLead(row),
          history: [
            ...events.filter(event => event.lead_id === row.id).map(toAppLeadEventHistory),
            ...legacyEvents.filter(event => event.entity_id === row.id).map(toAppAuditLeadHistory),
          ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
        }));
      }

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
        source: r.source,
        title: r.title || `${r.project_type || 'Zakázka'} — ${r.customer_name || 'Klient'}`,
        description: r.description || '',
        city: r.city || '',
        address: r.address || '',
        customerName: r.customer_name || '',
        customerPhone: r.phone || '',
        customerEmail: r.email || '',
        preferredDate: r.preferred_date || '',
        price: r.budget || r.price || 0,
        status: r.status || 'New',
        priority: r.priority || 'Medium',
        assignedEmployeeId: r.assigned_employee_id || '',
        assignedEmployeeName: r.assigned_employee_name || '',
        thumbnail: r.thumbnail || '',
        photos: r.photos || [],
        files: r.files || [],
        checklist: r.checklist || [],
        aiSummary: r.ai_summary,
        timeline: r.timeline || [],
        aiChat: r.ai_chat || [],
        history: r.history || []
      }));
    } catch (err) {
      if (appSchemaReadsEnabled) throw err;
      console.error('Supabase fetch failed:', err);
      return [];
    }
  }

  async saveLead(orgId: string, lead: Partial<Lead>): Promise<Lead> {
    if (appSchemaReadsEnabled) {
      if (!appLeadWritesEnabled || !supabase || !isValidUUID(orgId)) throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
      const patch = toLeadPatch(lead);
      if (!lead.id) {
        if ((patch.status && patch.status !== 'new') || patch.assigned_to) {
          throw new Error('Stav a přiřazení změňte až po vytvoření zakázky.');
        }
        const { status: _status, assigned_to: _assignee, ...payload } = patch;
        const response = await supabase.rpc('app_create_lead', { p_payload: payload });
        return toAppLead(requireLeadWriteResult(response, orgId, { status: 'new', assigned_to: null }));
      }
      if (!isValidUUID(lead.id)) throw new Error('Neplatný identifikátor zakázky.');
      if ('assigned_to' in patch && Object.keys(patch).length === 1) {
        const assignee = patch.assigned_to as string | null;
        const response = await supabase.rpc('app_assign_lead', { p_lead_id: lead.id, p_employee_id: assignee });
        return toAppLead(requireLeadWriteResult(response, orgId, { id: lead.id, assigned_to: assignee }));
      }
      if (!Object.keys(patch).length || Object.keys(patch).some(field => !['description', 'address', 'phone', 'email'].includes(field))) {
        throw new Error('Tuto změnu nelze uložit jako úpravu detailu zakázky.');
      }
      const response = await supabase.rpc('app_edit_lead_details', { p_lead_id: lead.id, p_payload: patch });
      return toAppLead(requireLeadWriteResult(response, orgId, { id: lead.id }));
    }
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    }

    try {
      if (appSchemaReadsEnabled) {
        throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
      }

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
        throw error;
      }

      return {
        ...lead,
        id: data?.id || lead.id,
      } as Lead;
    } catch (err) {
      if (appSchemaReadsEnabled) throw err;
      console.warn('saveLead failed:', err);
      throw err;
    }
  }

  async updateLeadStatus(orgId: string, leadId: string, status: string): Promise<void> {
    if (appSchemaReadsEnabled) {
      if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId) || !isValidUUID(leadId)) {
        throw new Error('Supabase připojení nebo identifikátor zakázky není platný.');
      }
      if (!appLeadWritesEnabled) throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
      const requested = toLeadPatch({ status: status as Lead['status'] }).status as AppLeadRow['status'];
      const response = await supabase.rpc('app_set_lead_status', { p_lead_id: leadId, p_status: requested });
      requireLeadWriteResult(response, orgId, { id: leadId, status: requested });
      return;
    }
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId) || !isValidUUID(leadId)) {
      throw new Error('Supabase připojení nebo identifikátor zakázky není platný.');
    }

    if (appSchemaReadsEnabled) throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
    await supabase
      .from(appSchemaReadsEnabled ? 'app_leads' : 'leads')
      .update({ status: appSchemaReadsEnabled ? (appStatus[status] || 'new') : status })
      .eq('id', leadId)
      .eq(appSchemaReadsEnabled ? 'company_id' : 'organization_id', orgId);
  }

  async deleteLead(orgId: string, leadId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId) || !isValidUUID(leadId)) throw new Error('Supabase připojení nebo identifikátor zakázky není platný.');
    if (appSchemaReadsEnabled) throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
    await supabase.from(appSchemaReadsEnabled ? 'app_leads' : 'leads').delete().eq('id', leadId).eq(appSchemaReadsEnabled ? 'company_id' : 'organization_id', orgId);
  }

  private requireLeadAttachmentContext(orgId: string, leadId?: string) {
    if (!isSupabaseConfigured || !supabase || !appSchemaReadsEnabled) {
      throw new Error('Poznámky a soubory vyžadují aktivní cloudové připojení.');
    }
    if (!isValidUUID(orgId) || (leadId !== undefined && !isValidUUID(leadId))) {
      throw new Error('Neplatná firma nebo zakázka.');
    }
    return supabase;
  }

  private toLeadNote(row: any): LeadNote {
    return {
      id: row.id,
      companyId: row.company_id,
      leadId: row.lead_id,
      authorId: row.author_id,
      body: row.body,
      createdAt: row.created_at,
    };
  }

  private async requireAuthenticatedUserId(): Promise<string> {
    if (!supabase) throw new Error('Cloudové připojení není dostupné.');
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) throw new Error('Pro tuto akci se znovu přihlaste.');
    return data.user.id;
  }

  async getLeadNotes(orgId: string, leadId: string): Promise<LeadNote[]> {
    const client = this.requireLeadAttachmentContext(orgId, leadId);
    const { data, error } = await client.from('app_lead_notes')
      .select('id,company_id,lead_id,author_id,body,created_at')
      .eq('company_id', orgId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Poznámky se nepodařilo načíst.');
    return (data || []).map((row) => this.toLeadNote(row));
  }

  async addLeadNote(orgId: string, leadId: string, body: string): Promise<LeadNote> {
    const client = this.requireLeadAttachmentContext(orgId, leadId);
    const authorId = await this.requireAuthenticatedUserId();
    const { data, error } = await client.from('app_lead_notes')
      .insert({ company_id: orgId, lead_id: leadId, author_id: authorId, body: normalizeLeadNote(body) })
      .select('id,company_id,lead_id,author_id,body,created_at')
      .single();
    if (error || !data) throw new Error('Poznámku se nepodařilo uložit.');
    return this.toLeadNote(data);
  }

  async deleteLeadNote(orgId: string, noteId: string): Promise<void> {
    const client = this.requireLeadAttachmentContext(orgId);
    if (!isValidUUID(noteId)) throw new Error('Neplatná poznámka.');
    const deleted = await client.from('app_lead_notes').delete().eq('company_id', orgId).eq('id', noteId).select('id');
    requireOneDeletedRow(deleted, 'Poznámku nelze smazat. Majitel ji může smazat kdykoliv, autor do 15 minut.');
  }

  async getLeadFiles(orgId: string, leadId: string): Promise<LeadStoredFile[]> {
    const client = this.requireLeadAttachmentContext(orgId, leadId);
    const { data, error } = await client.from('app_lead_files')
      .select('id,company_id,lead_id,author_id,storage_path,file_name,mime_type,size_bytes,created_at')
      .eq('company_id', orgId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Soubory se nepodařilo načíst.');

    const withPreviews = await resolveSignedPreviews(data || [], path => client.storage.from('lead-files').createSignedUrl(path, 600));
    return withPreviews.map((row: any) => ({
        id: row.id,
        companyId: row.company_id,
        leadId: row.lead_id,
        authorId: row.author_id,
        storagePath: row.storage_path,
        fileName: row.file_name,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        createdAt: row.created_at,
        previewUrl: row.previewUrl,
      } satisfies LeadStoredFile));
  }

  async uploadLeadFile(orgId: string, leadId: string, file: File): Promise<LeadStoredFile> {
    const client = this.requireLeadAttachmentContext(orgId, leadId);
    validateLeadUpload(file);
    const authorId = await this.requireAuthenticatedUserId();
    const fileId = crypto.randomUUID();
    const storagePath = buildLeadFilePath(orgId, leadId, fileId, file.name);
    const { row, previewUrl } = await runLeadFileUpload({
      createSignedUploadUrl: () => client.storage.from('lead-files').createSignedUploadUrl(storagePath),
      uploadToSignedUrl: token => client.storage.from('lead-files').uploadToSignedUrl(
        storagePath, token, file, { contentType: file.type, upsert: false },
      ),
      insertMetadata: async () => await client.from('app_lead_files').insert({
        id: fileId,
        company_id: orgId,
        lead_id: leadId,
        author_id: authorId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      }).select('id,company_id,lead_id,author_id,storage_path,file_name,mime_type,size_bytes,created_at').single(),
      createSignedUrl: () => client.storage.from('lead-files').createSignedUrl(storagePath, 600),
      remove: path => client.storage.from('lead-files').remove([path]),
    }, storagePath, fileId);
    return {
      id: row.id,
      companyId: row.company_id,
      leadId: row.lead_id,
      authorId: row.author_id,
      storagePath: row.storage_path,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes),
      createdAt: row.created_at,
      previewUrl,
    };
  }

  async deleteLeadFile(orgId: string, file: LeadStoredFile): Promise<void> {
    const client = this.requireLeadAttachmentContext(orgId, file.leadId);
    if (file.companyId !== orgId || !isValidUUID(file.id)) throw new Error('Neplatný soubor.');
    await runLeadFileDelete(
      async () => await client.from('app_lead_files').delete().eq('company_id', orgId).eq('lead_id', file.leadId).eq('id', file.id).eq('storage_path', file.storagePath).select('id'),
      () => client.storage.from('lead-files').remove([file.storagePath]),
      file.id,
    );
  }

  async getEmployees(orgId: string): Promise<Employee[]> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    }

    if (appSchemaReadsEnabled) {
      const { data, error } = await supabase
        .from('app_members')
        .select('company_id,user_id,name,email,role,active')
        .eq('company_id', orgId)
        .eq('active', true);

      if (error) {
        console.warn('Supabase app_members read failed closed:', error.message);
        return [];
      }

      const members = ((data || []) as AppMemberRow[]).map(toAppMember);
      const { data: inviteData, error: inviteError } = await supabase
        .from('app_invites')
        .select('id,company_id,name,email,expires_at,created_at,accepted_at')
        .eq('company_id', orgId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());
      if (inviteError) throw new Error('Čekající pozvánky se nepodařilo načíst.');
      const memberEmails = new Set(members.map((member) => member.email.toLowerCase()));
      const pending = ((inviteData || []) as AppInviteRow[])
        .filter((invite) => !memberEmails.has(invite.email.toLowerCase()))
        .map(toPendingInvite);
      return [...members, ...pending];
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('organization_id', orgId);

    if (error || !data) {
      throw error || new Error('Zaměstnance se nepodařilo načíst.');
    }

    return data.map((e: any) => ({
      id: e.id,
      name: e.name || '',
      avatar: e.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(e.name || 'tech')}`,
      specialization: e.specialization || '',
      capacity: e.capacity ?? 0,
      maxCapacity: e.max_capacity ?? 0,
      todaysJobsCount: e.todays_jobs_count ?? 0,
      status: e.capacity > 90 ? 'Red' : e.capacity > 70 ? 'Orange' : 'Green',
      phone: e.phone || '',
      email: e.email || ''
    }));
  }

  async saveEmployee(orgId: string, employee: Partial<Employee>): Promise<Employee> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    }

    if (appSchemaReadsEnabled) {
      throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
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
      throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    }
    // Projects are not part of the verified app_* contract. Do not query the
    // removed legacy table from a configured deployment.
    if (appSchemaReadsEnabled) return [];
    const { data } = await supabase.from('projects').select('*').eq('organization_id', orgId);
    return data || [];
  }

  async saveProject(orgId: string, project: any): Promise<any> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    if (appSchemaReadsEnabled) throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
    const { data } = await supabase.from('projects').upsert({ ...project, organization_id: orgId }).select().single();
    return data || project;
  }

  async getBranding(orgId: string): Promise<CompanyBranding> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) {
      throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    }

    const { data, error } = await supabase.from('app_companies').select('id,name,slug,email,phone,address,color,logo_url,active').eq('id', orgId).single();
    if (appSchemaReadsEnabled && (error || !data)) {
      throw error || new Error('Firemní nastavení nebylo nalezeno v app_companies.');
    }
    return {
      name: data?.name || '',
      primaryColor: data?.color || '#2563eb',
      logoUrl: data?.logo_url,
      phone: data?.phone || '',
      email: data?.email || '',
      city: '',
      address: data?.address || '',
      services: []
    };
  }

  async saveBranding(orgId: string, branding: CompanyBranding): Promise<void> {
    if (!isSupabaseConfigured || !supabase || !isValidUUID(orgId)) throw new Error('Supabase připojení nebo identifikátor firmy není platný.');
    if (appSchemaReadsEnabled) throw new Error(APP_SCHEMA_WRITES_BLOCKED_MESSAGE);
    await supabase.from('organizations').update({
      name: branding.name,
      primary_color: branding.primaryColor,
      logo_url: branding.logoUrl
    }).eq('id', orgId);
  }
}
