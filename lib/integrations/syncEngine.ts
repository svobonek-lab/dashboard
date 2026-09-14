import { Lead, Employee, LeadStatus } from '@/types';
import { FieldMappingConfig, SyncResult, IntegrationType } from '@/types/integrations';
import { normalizeLeadStatus, normalizePrice, normalizePhone, normalizePriority } from './fieldMapping';
import { addOrganizationLog, updateIntegrationConfig } from './storage';

/**
 * Checks if a lead already exists in current organization's database
 */
export function findDuplicateLead(newLead: Partial<Lead>, existingLeads: Lead[]): Lead | null {
  const normNewPhone = normalizePhone(newLead.customerPhone || (newLead as any).phone || '').replace(/\s+/g, '');
  const normNewEmail = (newLead.customerEmail || (newLead as any).email || '').trim().toLowerCase();
  const normNewTitle = (newLead.title || '').trim().toLowerCase();
  const normNewCustomer = (newLead.customerName || '').trim().toLowerCase();

  for (const existing of existingLeads) {
    const existingPhone = normalizePhone(existing.customerPhone || '').replace(/\s+/g, '');
    const existingEmail = (existing.customerEmail || '').trim().toLowerCase();
    const existingTitle = (existing.title || '').trim().toLowerCase();
    const existingCustomer = (existing.customerName || '').trim().toLowerCase();

    // 1. Phone match (if valid length > 6)
    if (normNewPhone && existingPhone && normNewPhone.length > 6 && normNewPhone === existingPhone) {
      return existing;
    }

    // 2. Email match (if valid email)
    if (normNewEmail && existingEmail && normNewEmail.includes('@') && normNewEmail === existingEmail) {
      return existing;
    }

    // 3. Exact Title + Customer match
    if (normNewTitle && existingTitle && normNewTitle === existingTitle && normNewCustomer === existingCustomer) {
      return existing;
    }
  }

  return null;
}

/**
 * Ingests a batch of raw records (from CSV, SQL, Sheets, or Webhook) into the organization
 */
export async function ingestRecordsIntoOrganization(params: {
  organizationId: string;
  sourceType: IntegrationType;
  integrationName: string;
  rawRows: Record<string, any>[];
  fieldMapping: FieldMappingConfig;
  existingLeads: Lead[];
  existingEmployees: Employee[];
  deduplicate: boolean; // if true, update existing or skip; if false, append all
  updateExistingIfDuplicate?: boolean;
  onSaveLead: (lead: Lead) => Promise<any>;
  onSaveEmployee?: (emp: Partial<Employee>) => Promise<any>;
}): Promise<SyncResult> {
  const startTime = Date.now();
  const {
    organizationId,
    sourceType,
    integrationName,
    rawRows,
    fieldMapping,
    existingLeads,
    existingEmployees,
    deduplicate,
    updateExistingIfDuplicate = true,
    onSaveLead,
    onSaveEmployee
  } = params;

  let importedLeads = 0;
  let updatedLeads = 0;
  let skippedDuplicates = 0;
  let importedEmployees = 0;
  const errors: string[] = [];

  const employeeMap = new Map<string, Employee>();
  existingEmployees.forEach(e => employeeMap.set(e.name.toLowerCase().trim(), e));

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    try {
      let customerName = 'Importovaný zákazník';
      let title = `Zakázka #${i + 1}`;
      let price = 150000;
      let employeeName = 'Dispečink';
      let status: LeadStatus = 'New';
      let phone = '';
      let email = '';
      let city = 'ČR';
      let address = 'ČR';
      let date = new Date().toISOString().substring(0, 10);
      let description = `Importováno ze zdroje: ${integrationName}`;
      let priority = 'Medium';

      // Apply mapping
      for (const [colName, targetField] of Object.entries(fieldMapping)) {
        const val = row[colName];
        if (val === undefined || val === null || targetField === 'ignore') continue;

        switch (targetField) {
          case 'customerName':
            customerName = String(val).trim() || customerName;
            break;
          case 'title':
            title = String(val).trim() || title;
            break;
          case 'price':
            price = normalizePrice(val);
            break;
          case 'assignedEmployeeName':
            employeeName = String(val).trim() || employeeName;
            break;
          case 'status':
            status = normalizeLeadStatus(val);
            break;
          case 'customerPhone':
            phone = normalizePhone(val);
            break;
          case 'customerEmail':
            email = String(val).trim();
            break;
          case 'city':
            city = String(val).trim() || city;
            break;
          case 'address':
            address = String(val).trim() || address;
            break;
          case 'preferredDate':
            date = String(val).trim() || date;
            break;
          case 'description':
            description = String(val).trim() || description;
            break;
          case 'priority':
            priority = String(val).trim();
            break;
        }
      }

      // Handle Employee Auto-Registration
      let assignedEmpId = 'emp-1';
      if (employeeName && employeeName !== 'Dispečink') {
        const empKey = employeeName.toLowerCase().trim();
        if (employeeMap.has(empKey)) {
          assignedEmpId = employeeMap.get(empKey)!.id;
        } else if (onSaveEmployee) {
          // Register new employee automatically
          const newEmpData: Partial<Employee> = {
            name: employeeName,
            specialization: 'Stavební technik & montážník',
            phone: '+420 774 ' + Math.floor(100000 + Math.random() * 900000),
            email: `${employeeName.toLowerCase().replace(/[^a-z]/g, '')}@firma.cz`,
            capacity: 75,
            status: 'Green',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            maxCapacity: 100,
            todaysJobsCount: 1
          };
          const savedEmp = await onSaveEmployee(newEmpData);
          if (savedEmp && savedEmp.id) {
            assignedEmpId = savedEmp.id;
            employeeMap.set(empKey, savedEmp as Employee);
            importedEmployees++;
          }
        }
      }

      const candidateLead: Partial<Lead> = {
        organization_id: organizationId,
        title,
        customerName,
        customerPhone: phone,
        customerEmail: email,
        city,
        address,
        preferredDate: date,
        price: price || 120000,
        status,
        priority: normalizePriority(priority),
        assignedEmployeeId: assignedEmpId,
        assignedEmployeeName: employeeName,
        thumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f2?auto=format&fit=crop&w=400&q=80',
        photos: [],
        files: [],
        createdDate: new Date().toLocaleDateString('cs-CZ'),
        urgency: priority,
        description,
        checklist: [
          { id: 'c-1', text: 'Zkontrolovat data načtená z externího systému', completed: true },
          { id: 'c-2', text: 'Ověřit telefonický kontakt se zákazníkem', completed: false }
        ],
        aiSummary: {
          jobType: 'Externě importovaná zakázka',
          complexity: 'Medium',
          estimatedRange: `${(price || 120000).toLocaleString('cs-CZ')} Kč`,
          assignedEmployee: employeeName,
          risks: ['Zkontrolovat termínovou dostupnost montážní party'],
          recommendedNextStep: 'Kontaktovat zákazníka a potvrdit technické parametry.'
        },
        aiChat: [],
        timeline: [
          {
            id: 't-1',
            title: `Import z ${integrationName}`,
            date: new Date().toLocaleDateString('cs-CZ'),
            time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
            completed: true,
            description: `Záznam byl synchronizován přes modul ${integrationName}.`
          }
        ],
        history: [
          {
            id: 'h-' + Date.now(),
            timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
            action: `Import z ${integrationName}`,
            author: 'Enterprise Sync'
          }
        ]
      };

      // Check for duplication
      if (deduplicate) {
        const existing = findDuplicateLead(candidateLead, existingLeads);
        if (existing) {
          if (updateExistingIfDuplicate) {
            const mergedLead: Lead = {
              ...existing,
              ...candidateLead,
              id: existing.id,
              organization_id: organizationId,
              history: [
                ...(existing.history || []),
                {
                  id: 'h-' + Date.now(),
                  timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
                  action: `Aktualizováno z integrace ${integrationName}`,
                  author: 'Enterprise Sync'
                }
              ]
            };
            await onSaveLead(mergedLead);
            updatedLeads++;
          } else {
            skippedDuplicates++;
          }
          continue;
        }
      }

      // Create brand new lead
      const finalLead: Lead = {
        ...candidateLead,
        id: `int-lead-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`
      } as Lead;

      await onSaveLead(finalLead);
      importedLeads++;
    } catch (err: any) {
      errors.push(`Řádek ${i + 1}: ${err.message || 'Chyba při ukládání záznamu'}`);
    }
  }

  const durationMs = Date.now() - startTime;
  const success = errors.length === 0 || importedLeads > 0;

  // Log to telemetry
  addOrganizationLog(organizationId, {
    integrationType: sourceType,
    level: success ? 'success' : 'error',
    message: `${integrationName}: ${importedLeads} nových, ${updatedLeads} aktualizováno, ${skippedDuplicates} duplicit vynecháno (${durationMs} ms).`,
    details: errors.length > 0 ? `Chyby: ${errors.slice(0, 3).join(', ')}` : undefined,
    recordsProcessed: importedLeads + updatedLeads,
    durationMs
  });

  // Update integration status card
  updateIntegrationConfig(organizationId, `int-${sourceType}-${organizationId}`, {
    status: 'connected',
    lastSync: new Date().toISOString(),
    lastSyncStatus: success ? 'success' : 'error',
    lastSyncError: errors.length > 0 ? errors[0] : undefined,
    recordsCount: importedLeads + updatedLeads
  });

  return {
    success,
    importedLeads,
    updatedLeads,
    skippedDuplicates,
    importedEmployees,
    durationMs,
    message: `Synchronizace dokončena: ${importedLeads} nových zakázek, ${updatedLeads} aktualizováno, ${skippedDuplicates} duplicit přeskočeno (${durationMs} ms).`,
    errors
  };
}
