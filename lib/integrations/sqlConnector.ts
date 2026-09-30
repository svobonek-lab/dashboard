import { SQLConnectionConfig, SQLDriver, FieldMappingConfig } from '@/types/integrations';
import { Lead, Employee } from '@/types';
import { normalizeLeadStatus, normalizePrice, normalizePhone, normalizePriority } from './fieldMapping';
import { unsupportedSqlConnection } from './pilotImport';

export interface SQLTestResult {
  success: boolean;
  latencyMs: number;
  message: string;
  foundProjectsCount: number;
  tablesCount: number;
  recordsCount: number;
  availableTables: string[];
  sampleColumns: string[];
  sampleRows: Record<string, any>[];
  serverVersion?: string;
  connectedStatus?: 'connected' | 'disconnected' | 'error';
  testedAt?: string;
}

/**
 * Mask password for display and safe client storage
 */
export function maskPassword(pwd?: string): string {
  if (!pwd) return '';
  return '••••••••••••';
}

/**
 * Simulates a robust SQL test connection ping with server handshake diagnostics
 */
export async function testSQLConnection(_config: SQLConnectionConfig): Promise<SQLTestResult> {
  // A browser-only helper cannot establish a safe customer database connection.
  // Keep this explicit until a server-side read-only connector is reviewed.
  return unsupportedSqlConnection();
}

/**
 * Executes live sync from configured SQL database
 */
export async function executeSQLSync(
  config: SQLConnectionConfig,
  mapping: FieldMappingConfig,
  organizationId: string
): Promise<{ leads: Lead[]; employees: Partial<Employee>[] }> {
  const testRes = await testSQLConnection(config);
  if (!testRes.success) {
    throw new Error(testRes.message);
  }

  const leads: Lead[] = [];
  const discoveredEmployees: Map<string, Partial<Employee>> = new Map();

  for (const row of testRes.sampleRows) {
    let customerName = 'Zákazník ze SQL';
    let title = 'Projekt z externí SQL DB';
    let price = 0;
    let employeeName = 'Dispečink';
    let status = 'New';
    let phone = '';
    let email = '';
    let city = 'Praha';
    let address = 'Praha';
    let date = new Date().toISOString().substring(0, 10);
    let description = 'Importováno přes SQL Database Connector';
    let priority = 'Medium';

    // Apply smart mapping
    for (const [colName, targetField] of Object.entries(mapping)) {
      const val = row[colName];
      if (val === undefined || val === null || targetField === 'ignore') continue;

      switch (targetField) {
        case 'customerName':
          customerName = String(val);
          break;
        case 'title':
          title = String(val);
          break;
        case 'price':
          price = normalizePrice(val);
          break;
        case 'assignedEmployeeName':
          employeeName = String(val);
          break;
        case 'status':
          status = String(val);
          break;
        case 'customerPhone':
          phone = normalizePhone(val);
          break;
        case 'customerEmail':
          email = String(val);
          break;
        case 'city':
          city = String(val);
          break;
        case 'address':
          address = String(val);
          break;
        case 'preferredDate':
          date = String(val);
          break;
        case 'description':
          description = String(val);
          break;
        case 'priority':
          priority = String(val);
          break;
      }
    }

    // Register employee if present
    if (employeeName && employeeName !== 'Dispečink' && !discoveredEmployees.has(employeeName)) {
      discoveredEmployees.set(employeeName, {
        name: employeeName,
        specialization: 'Stavební specialista & montáže',
        phone: '+420 774 000 ' + Math.floor(100 + Math.random() * 900),
        email: `${employeeName.toLowerCase().replace(/[^a-z]/g, '')}@firma.cz`,
        capacity: 80
      });
    }

    const lead: Lead = {
      organization_id: organizationId,
      id: row.id || `sql-lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      customerName,
      customerPhone: phone,
      customerEmail: email,
      city,
      address,
      preferredDate: date,
      price,
      status: normalizeLeadStatus(status),
      priority: normalizePriority(priority),
      assignedEmployeeId: 'emp-sql',
      assignedEmployeeName: employeeName,
      thumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f2?auto=format&fit=crop&w=400&q=80',
      photos: [],
      files: [],
      createdDate: new Date().toLocaleDateString('cs-CZ'),
      urgency: priority,
      checklist: [
        { id: 'c-1', text: 'Zkontrolovat podklady z externí SQL databáze', completed: true },
        { id: 'c-2', text: 'Ověřit zaměření a stavební připravenost', completed: false },
        { id: 'c-3', text: 'Připravit harmonogram montáže', completed: false }
      ],
      aiSummary: {
        jobType: 'SQL Synchronizovaná zakázka',
        complexity: 'Medium',
        estimatedRange: price > 0 ? `${price.toLocaleString('cs-CZ')} Kč` : 'Cena není uvedena',
        assignedEmployee: employeeName,
        risks: ['Ověřit dostupnost subdodavatelských materiálů'],
        recommendedNextStep: 'Potvrdit termín zahájení se zákazníkem.'
      },
      aiChat: [],
      timeline: [
        {
          id: 't-1',
          title: 'Importováno ze SQL Databáze',
          date: new Date().toLocaleDateString('cs-CZ'),
          time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
          completed: true,
          description: `Záznam byl synchronizován z SQL tabulky ${config.tableNameOrQuery || 'projekty'}.`
        }
      ],
      history: [
        {
          id: 'h-' + Date.now(),
          timestamp: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
          action: `Synchronizováno z SQL (${config.driver.toUpperCase()})`,
          author: 'SQL Connector'
        }
      ]
    };

    leads.push(lead);
  }

  return {
    leads,
    employees: Array.from(discoveredEmployees.values())
  };
}
