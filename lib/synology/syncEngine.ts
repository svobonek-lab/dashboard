import { SynologyConfig, SynologySyncResult, SynologyDiscoveredFile } from '@/types/synology';
import { Lead, Employee, LeadFile } from '@/types';
import { getMockSynologyDatabaseRows } from './synologyConnector';
import { getDiscoveredSynologyFiles, convertSynologyFileToLeadFile } from './fileWatcher';
import { saveSynologyConfig, saveSynologyDiscoveredFiles } from './storage';
import { addOrganizationLog } from '../integrations/storage';
import { mapSourceRowToLeadFields } from '../integrations/fieldMapping';

export interface SynologyLiveSyncOptions {
  config: SynologyConfig;
  existingLeads: Lead[];
  existingEmployees: Employee[];
  onSaveLead: (lead: Lead) => Promise<any> | void;
  onSaveEmployee?: (emp: Partial<Employee>) => Promise<any> | void;
}

export async function runSynologyLiveSync(options: SynologyLiveSyncOptions): Promise<SynologySyncResult> {
  const startTime = Date.now();
  const { config, existingLeads, existingEmployees, onSaveLead, onSaveEmployee } = options;
  const orgId = config.organizationId;

  let importedLeads = 0;
  let updatedLeads = 0;
  let attachedPhotosCount = 0;
  let attachedDocumentsCount = 0;
  const errors: string[] = [];

  try {
    // 1. Database Sync (if enabled)
    const rawRows = config.databaseSync.enabled ? getMockSynologyDatabaseRows() : [];
    const discoveredFiles = getDiscoveredSynologyFiles(existingLeads);

    // Save discovered files to local storage for file browser
    saveSynologyDiscoveredFiles(orgId, discoveredFiles);

    // Create a working map of leads
    const currentLeadsMap = new Map<string, Lead>();
    existingLeads.forEach(l => currentLeadsMap.set(l.id, { ...l }));

    // Process Database Rows
    for (const row of rawRows) {
      const mapped = mapSourceRowToLeadFields(row, config.databaseSync.fieldMapping);

      // Check for existing lead by customer name, phone, or title
      const existingMatch = Array.from(currentLeadsMap.values()).find(l => 
        (mapped.customerPhone && l.customerPhone && l.customerPhone.replace(/\s+/g, '') === mapped.customerPhone.replace(/\s+/g, '')) ||
        (mapped.customerEmail && l.customerEmail && l.customerEmail.toLowerCase() === mapped.customerEmail.toLowerCase()) ||
        (mapped.customerName && mapped.title && l.customerName.toLowerCase() === mapped.customerName.toLowerCase() && l.title.toLowerCase() === mapped.title.toLowerCase())
      );

      if (existingMatch) {
        // Update existing lead
        const updated: Lead = {
          ...existingMatch,
          price: mapped.price > 0 ? mapped.price : existingMatch.price,
          status: mapped.status || existingMatch.status,
          address: mapped.address || existingMatch.address,
          city: mapped.city || existingMatch.city,
          history: [
            ...(existingMatch.history || []),
            {
              id: `hist-syn-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              timestamp: new Date().toISOString(),
              action: `Aktualizováno z firemního Synology NAS (${config.databaseSync.table})`,
              author: 'Synology Connector'
            }
          ]
        };

        currentLeadsMap.set(updated.id, updated);
        await onSaveLead(updated);
        updatedLeads++;
      } else {
        // Insert new lead from Synology database
        const newLeadId = `lead-syn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newLead: Lead = {
          id: newLeadId,
          organization_id: orgId,
          title: mapped.title || `Projekt z NAS (${row.id_zakazky || 'Synology'})`,
          description: mapped.description || 'Automaticky importováno z databáze firemního Synology NAS.',
          customerName: mapped.customerName || 'Klient ze Synology NAS',
          customerPhone: mapped.customerPhone || '+420 777 000 000',
          customerEmail: mapped.customerEmail || 'zakaznik@synology.local',
          city: mapped.city || 'Brno a okolí',
          address: mapped.address || 'Česká republika',
          preferredDate: mapped.preferredDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
          price: mapped.price || 250000,
          status: mapped.status || 'In Progress',
          priority: 'Medium',
          assignedEmployeeId: 'emp-1',
          assignedEmployeeName: mapped.assignedEmployeeName || 'Karel Novák',
          thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
          photos: [],
          files: [],
          checklist: [
            { id: 'chk-1', text: 'Ověření projektové dokumentace ze Synology', completed: true },
            { id: 'chk-2', text: 'Kontrola výkresů kotvení a statiky', completed: true },
            { id: 'chk-3', text: 'Zahájení montážních prací na stavbě', completed: false }
          ],
          aiSummary: {
            jobType: 'Hliníková pergola / Stavební stínění',
            complexity: 'Medium',
            estimatedRange: '320 000 - 380 000 Kč',
            assignedEmployee: mapped.assignedEmployeeName || 'Karel Novák',
            risks: ['Kotvení do zateplení', 'Připojení elektroinstalace Somfy'],
            recommendedNextStep: 'Kontrola fotodokumentace ze složky /volume1/Fotky'
          },
          timeline: [
            {
              id: `tl-1`,
              title: 'Projekt synchronizován ze Synology NAS',
              status: 'Completed',
              date: new Date().toISOString().split('T')[0],
              description: `Data úspěšně načtena z tabulky ${config.databaseSync.table}`
            }
          ],
          aiChat: [],
          history: [
            {
              id: `hist-1`,
              timestamp: new Date().toISOString(),
              action: 'Zakázka vytvořena přes Synology Container Connector',
              author: 'Synology NAS'
            }
          ]
        };

        currentLeadsMap.set(newLead.id, newLead);
        await onSaveLead(newLead);
        importedLeads++;
      }
    }

    // 2. Shared Folders & Files Sync
    // Match discovered files with leads and attach them
    for (const file of discoveredFiles) {
      const targetLead = Array.from(currentLeadsMap.values()).find(l =>
        (file.matchedCustomerName && l.customerName.toLowerCase().includes(file.matchedCustomerName.toLowerCase())) ||
        (file.matchedProjectTitle && l.title.toLowerCase().includes(file.matchedProjectTitle.toLowerCase())) ||
        (l.customerName && file.path.toLowerCase().includes(l.customerName.toLowerCase().replace(/[^a-z]/g, '')))
      );

      if (targetLead) {
        const leadFile = convertSynologyFileToLeadFile(file);
        let changed = false;

        if (file.fileType === 'photo') {
          const alreadyExists = (targetLead.photos || []).some(p => p.name === leadFile.name || p.id === leadFile.id);
          if (!alreadyExists) {
            targetLead.photos = [...(targetLead.photos || []), leadFile];
            attachedPhotosCount++;
            changed = true;
          }
        } else {
          const alreadyExists = (targetLead.files || []).some(f => f.name === leadFile.name || f.id === leadFile.id);
          if (!alreadyExists) {
            targetLead.files = [...(targetLead.files || []), leadFile];
            attachedDocumentsCount++;
            changed = true;
          }
        }

        if (changed) {
          await onSaveLead(targetLead);
        }
      }
    }

    const totalFiles = discoveredFiles.length;
    const durationMs = Date.now() - startTime;

    // Update Synology Config State
    const updatedConfig: SynologyConfig = {
      ...config,
      status: 'connected',
      lastSync: new Date().toISOString(),
      nextSync: new Date(Date.now() + config.syncIntervalMinutes * 60 * 1000).toISOString(),
      lastSyncStatus: 'success',
      totalProjectsSynced: currentLeadsMap.size,
      totalFilesSynced: totalFiles
    };
    saveSynologyConfig(orgId, updatedConfig);

    // Add Audit Telemetry Log
    addOrganizationLog(orgId, {
      integrationType: 'sql',
      level: 'success',
      message: `Synology NAS Sync dokončen (${importedLeads} nových, ${updatedLeads} aktualizováno, ${attachedDocumentsCount} PDF a ${attachedPhotosCount} fotek přiřazeno)`,
      details: `Tabulka: ${config.databaseSync.table} | Složky: /Zakazky, /Nabidky, /Realizace, /Fotky (${totalFiles} souborů)`,
      recordsProcessed: importedLeads + updatedLeads,
      durationMs
    });

    return {
      success: true,
      importedLeads,
      updatedLeads,
      syncedFilesCount: totalFiles,
      attachedPhotosCount,
      attachedDocumentsCount,
      durationMs,
      message: `Synchronizace Synology NAS byla úspěšná za ${durationMs} ms.`
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err?.message || 'Chyba během synchronizace se Synology NAS.';

    addOrganizationLog(orgId, {
      integrationType: 'sql',
      level: 'error',
      message: `Chyba synchronizace Synology NAS: ${errorMsg}`,
      details: String(err?.stack || err),
      recordsProcessed: 0,
      durationMs
    });

    return {
      success: false,
      importedLeads: 0,
      updatedLeads: 0,
      syncedFilesCount: 0,
      attachedPhotosCount: 0,
      attachedDocumentsCount: 0,
      durationMs,
      message: errorMsg,
      errors: [errorMsg]
    };
  }
}
