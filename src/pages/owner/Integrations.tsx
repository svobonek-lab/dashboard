import React, { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { 
  IntegrationConfig, 
  IntegrationLog, 
  SQLConnectionConfig, 
  GoogleSheetsConfig, 
  FieldMappingConfig,
  RestApiConfig
} from '@/types/integrations';
import { 
  getOrganizationIntegrations, 
  saveOrganizationIntegrations, 
  updateIntegrationConfig, 
  getOrganizationLogs, 
  addOrganizationLog 
} from '@/lib/integrations/storage';
import { executeSQLSync } from '@/lib/integrations/sqlConnector';
import { executeGoogleSheetsSync } from '@/lib/integrations/sheetsConnector';
import { ingestRecordsIntoOrganization } from '@/lib/integrations/syncEngine';
import { SQLConnectorModal } from '@/components/integrations/SQLConnectorModal';
import { GoogleSheetsModal } from '@/components/integrations/GoogleSheetsModal';
import { CSVImportModal } from '@/components/integrations/CSVImportModal';
import { WebhookDetailsModal } from '@/components/integrations/WebhookDetailsModal';
import { 
  Database, 
  FileSpreadsheet, 
  UploadCloud, 
  Webhook, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  SlidersHorizontal, 
  Clock, 
  Activity, 
  Lock, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight, 
  Zap, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Server,
  Building2,
  HardDrive
} from 'lucide-react';
import { Link } from '@/src/app/router';
import { getSynologyConfig } from '@/lib/synology/storage';

import { Lead, Employee } from '@/types';

interface IntegrationsProps {
  leads?: Lead[];
  employees?: Employee[];
  onAddLead?: (lead: Lead) => void;
}

export const Integrations: React.FC<IntegrationsProps> = ({
  leads: propsLeads,
  employees: propsEmployees,
  onAddLead
}) => {
  const { 
    currentOrg, 
    saveLead, 
    saveEmployee, 
    fetchLeads, 
    fetchEmployees 
  } = useOrganization();

  const [internalLeads, setInternalLeads] = useState<Lead[]>(propsLeads || []);
  const [internalEmployees, setInternalEmployees] = useState<Employee[]>(propsEmployees || []);

  useEffect(() => {
    if (propsLeads) setInternalLeads(propsLeads);
    else fetchLeads().then(l => setInternalLeads(l)).catch(console.error);

    if (propsEmployees) setInternalEmployees(propsEmployees);
    else fetchEmployees().then(e => setInternalEmployees(e)).catch(console.error);
  }, [propsLeads, propsEmployees, currentOrg]);

  const leads = propsLeads || internalLeads;
  const employees = propsEmployees || internalEmployees;

  const orgId = currentOrg?.id || 'default-org';

  // Integrations state
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'warning' | 'error'>('all');
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  const [globalNotification, setGlobalNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<'sql' | 'sheets' | 'csv' | 'webhook' | null>(null);

  // Load configs & logs when orgId changes
  const loadData = useCallback(() => {
    if (!orgId) return;
    const orgConfigs = getOrganizationIntegrations(orgId);
    const orgLogs = getOrganizationLogs(orgId);
    setConfigs(orgConfigs);
    setLogs(orgLogs);
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler for saving SQL config
  const handleSaveSQLConfig = (sqlConfig: SQLConnectionConfig, mapping: FieldMappingConfig) => {
    const updated = updateIntegrationConfig(orgId, `int-sql-${orgId}`, {
      type: 'sql',
      name: `SQL Databáze (${sqlConfig.driver.toUpperCase()})`,
      status: 'connected',
      sqlConfig,
      fieldMapping: mapping
    });
    loadData();
    addOrganizationLog(orgId, {
      integrationType: 'sql',
      level: 'info',
      message: `Konfigurace SQL databáze (${sqlConfig.driver}) byla aktualizována a uložena.`
    });
  };

  // Handler for running SQL sync
  const handleRunSQLSync = async (sqlConfig: SQLConnectionConfig, mapping: FieldMappingConfig) => {
    try {
      const { leads: importedLeads, employees: importedEmployees } = await executeSQLSync(sqlConfig, mapping, orgId);
      
      const result = await ingestRecordsIntoOrganization({
        organizationId: orgId,
        sourceType: 'sql',
        integrationName: `SQL Server (${sqlConfig.driver.toUpperCase()})`,
        rawRows: importedLeads.map(l => ({
          nazev_projektu: l.title,
          zakaznik_jmeno: l.customerName,
          telefon: l.customerPhone,
          email: l.customerEmail,
          mesto: l.city,
          adresa_stavby: l.address,
          cena_smluvni: l.price,
          stav: l.status,
          odpovedny_technik: l.assignedEmployeeName,
          termin_zahajeni: l.preferredDate,
          poznamka: l.description
        })),
        fieldMapping: mapping,
        existingLeads: leads,
        existingEmployees: employees,
        deduplicate: true,
        updateExistingIfDuplicate: true,
        onSaveLead: saveLead,
        onSaveEmployee: saveEmployee
      });

      await fetchLeads();
      await fetchEmployees();
      loadData();
      return result;
    } catch (e: any) {
      addOrganizationLog(orgId, {
        integrationType: 'sql',
        level: 'error',
        message: `SQL Synchronizace selhala: ${e.message || 'Chyba připojení'}`
      });
      loadData();
      throw e;
    }
  };

  // Handler for saving Google Sheets config
  const handleSaveSheetsConfig = (sheetsConfig: GoogleSheetsConfig, mapping: FieldMappingConfig) => {
    updateIntegrationConfig(orgId, `int-sheets-${orgId}`, {
      type: 'google_sheets',
      name: `Google Sheets (${sheetsConfig.sheetName})`,
      status: 'connected',
      sheetsConfig,
      fieldMapping: mapping
    });
    loadData();
    addOrganizationLog(orgId, {
      integrationType: 'google_sheets',
      level: 'info',
      message: `Konfigurace Google Sheets (${sheetsConfig.sheetName}) byla aktualizována.`
    });
  };

  // Handler for running Google Sheets sync
  const handleRunSheetsSync = async (sheetsConfig: GoogleSheetsConfig, mapping: FieldMappingConfig) => {
    try {
      const { leads: importedLeads } = await executeGoogleSheetsSync(sheetsConfig, mapping, orgId);
      
      const result = await ingestRecordsIntoOrganization({
        organizationId: orgId,
        sourceType: 'google_sheets',
        integrationName: `Google Sheets (${sheetsConfig.sheetName})`,
        rawRows: importedLeads.map(l => ({
          'Typ projektu': l.title,
          'Klient / Objednatel': l.customerName,
          'Telefon': l.customerPhone,
          'E-mail': l.customerEmail,
          'Město': l.city,
          'Adresa': l.address,
          'Předpokládaná cena': l.price,
          'Stav': l.status,
          'Montážník / Mistr': l.assignedEmployeeName,
          'Termín montáže': l.preferredDate,
          'Poznámka ke stavbě': l.description
        })),
        fieldMapping: mapping,
        existingLeads: leads,
        existingEmployees: employees,
        deduplicate: true,
        updateExistingIfDuplicate: true,
        onSaveLead: saveLead,
        onSaveEmployee: saveEmployee
      });

      await fetchLeads();
      await fetchEmployees();
      loadData();
      return result;
    } catch (e: any) {
      addOrganizationLog(orgId, {
        integrationType: 'google_sheets',
        level: 'error',
        message: `Google Sheets sync selhal: ${e.message || 'Chyba čtení listu'}`
      });
      loadData();
      throw e;
    }
  };

  // Handler for CSV / Excel batch import
  const handleImportCSVBatch = async (
    rows: Record<string, any>[],
    mapping: FieldMappingConfig,
    deduplicate: boolean,
    updateExisting: boolean
  ) => {
    try {
      const result = await ingestRecordsIntoOrganization({
        organizationId: orgId,
        sourceType: 'csv',
        integrationName: 'Excel / CSV Import Studio',
        rawRows: rows,
        fieldMapping: mapping,
        existingLeads: leads,
        existingEmployees: employees,
        deduplicate,
        updateExistingIfDuplicate: updateExisting,
        onSaveLead: saveLead,
        onSaveEmployee: saveEmployee
      });

      await fetchLeads();
      await fetchEmployees();
      loadData();
      return result;
    } catch (e: any) {
      addOrganizationLog(orgId, {
        integrationType: 'csv',
        level: 'error',
        message: `CSV Import selhal: ${e.message}`
      });
      loadData();
      throw e;
    }
  };

  // Handler for sending simulated webhook payload
  const handleSendWebhookTest = async () => {
    const testPayload = {
      title: 'Realizace pergoly s naklápěcími lamelami (Webhook)',
      customer_name: 'Ing. Marek Dvořák',
      phone: '+420 608 555 444',
      email: 'dvorak.marek@centrum.cz',
      city: 'Praha 4',
      address: 'Antala Staška 12, Praha 4',
      price: 285000,
      status: 'New',
      description: 'Poptávka odeslána přes REST API / Inbound Webhook z webového formuláře.'
    };

    const result = await ingestRecordsIntoOrganization({
      organizationId: orgId,
      sourceType: 'rest_api',
      integrationName: 'Inbound Webhook API',
      rawRows: [testPayload],
      fieldMapping: {
        title: 'title',
        customer_name: 'customerName',
        phone: 'customerPhone',
        email: 'customerEmail',
        city: 'city',
        address: 'address',
        price: 'price',
        status: 'status',
        description: 'description'
      },
      existingLeads: leads,
      existingEmployees: employees,
      deduplicate: false,
      onSaveLead: saveLead,
      onSaveEmployee: saveEmployee
    });

    await fetchLeads();
    loadData();
    return result;
  };

  // Global Sync All Action
  const handleSyncAll = async () => {
    setIsGlobalSyncing(true);
    setGlobalNotification(null);
    try {
      const sqlConfig = configs.find(c => c.type === 'sql')?.sqlConfig;
      const sqlMapping = configs.find(c => c.type === 'sql')?.fieldMapping || {};
      const sheetsConfig = configs.find(c => c.type === 'google_sheets')?.sheetsConfig;
      const sheetsMapping = configs.find(c => c.type === 'google_sheets')?.fieldMapping || {};

      let totalSynced = 0;

      if (sqlConfig && sqlConfig.host) {
        const sqlRes = await handleRunSQLSync(sqlConfig, sqlMapping);
        totalSynced += (sqlRes.importedLeads + sqlRes.updatedLeads);
      }

      if (sheetsConfig && sheetsConfig.spreadsheetUrlOrId) {
        const sheetsRes = await handleRunSheetsSync(sheetsConfig, sheetsMapping);
        totalSynced += (sheetsRes.importedLeads + sheetsRes.updatedLeads);
      }

      setGlobalNotification({
        type: 'success',
        message: `Globální synchronizace dokončena: ${totalSynced} zakázek bylo aktualizováno ve vašem CRM.`
      });
    } catch (e: any) {
      setGlobalNotification({
        type: 'error',
        message: `Chyba při globální synchronizaci: ${e.message}`
      });
    } finally {
      setIsGlobalSyncing(false);
    }
  };

  // Disconnect handler
  const handleToggleDisconnect = (configId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
    updateIntegrationConfig(orgId, configId, { status: newStatus as any });
    loadData();
  };

  // Telemetry metrics
  const connectedCount = configs.filter(c => c.status === 'connected').length;
  const totalImportedRecords = configs.reduce((acc, c) => acc + (c.recordsCount || 0), 0);
  const sqlConfig = configs.find(c => c.type === 'sql');
  const sheetsConfig = configs.find(c => c.type === 'google_sheets');
  const restConfig = configs.find(c => c.type === 'rest_api')?.restConfig || {
    webhookSecret: `whsec_${orgId.substring(0, 8)}_demo`,
    webhookUrl: `https://api.buildflow.app/v1/webhooks/inbound/${orgId}`,
    apiKey: `bf_live_${orgId.substring(0, 8)}_token`,
    autoSyncLeads: true
  };

  const filteredLogs = logs.filter(l => {
    if (logFilter === 'all') return true;
    return l.level === logFilter;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-16">
      
      {/* Top Header & Breadcrumb */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shadow-inner">
              <Zap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">Integrace & Datový Hub</h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black tracking-wider uppercase">
                  Enterprise AI Layer
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Organizace: <strong className="text-slate-200">{currentOrg?.name || 'Moje Stavební Firma'}</strong> • Živá synchronizace s existujícími systémy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSyncAll}
              disabled={isGlobalSyncing}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGlobalSyncing ? 'animate-spin' : ''}`} />
              <span>{isGlobalSyncing ? 'Synchronizuji všechny systémy...' : 'Spustit celkovou synchronizaci'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-8">
        
        {/* Global Notification Banner */}
        {globalNotification && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold animate-in fade-in ${
            globalNotification.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {globalNotification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
              <span>{globalNotification.message}</span>
            </div>
            <button 
              onClick={() => setGlobalNotification(null)}
              className="text-slate-400 hover:text-white text-sm px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Global Telemetry & Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aktivní konektory</p>
              <p className="text-lg font-black text-white">{connectedCount} <span className="text-xs font-normal text-slate-400">z {configs.length}</span></p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Synchronizováno záznamů</p>
              <p className="text-lg font-black text-white">{totalImportedRecords + leads.length} <span className="text-xs font-normal text-slate-400">zakázek</span></p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stav synchronizace</p>
              <p className="text-lg font-black text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                100% Online
              </p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Zabezpečení & Tenant</p>
              <p className="text-xs font-black text-slate-200 mt-1">Izolace organizace</p>
            </div>
          </div>
        </div>

        {/* Integration Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Konektory firemních systémů & databází
            </h2>
            <span className="text-xs text-slate-400">
              Data jsou okamžitě mapována do CRM Kanbanu a kapacit techniků
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* 0. Synology NAS Integration Card */}
            <div className="bg-slate-800/90 border border-cyan-500/30 hover:border-cyan-500/50 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold shadow-sm shadow-cyan-500/10">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    {getSynologyConfig(orgId).status === 'connected' ? 'Připojeno (DSM 7.2)' : 'Připojeno'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-white">Synology NAS (DSM 7.2+)</h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Docker & DB
                  </span>
                </div>
                
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Synchronizace sdílených složek (/Zakazky, /Fotky, /Nabidky) a databází MariaDB z firemního NAS úložiště.
                </p>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-300 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model:</span>
                    <span className="text-cyan-300 font-bold truncate max-w-[150px]">{getSynologyConfig(orgId).detectedModel || 'Synology DS923+'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Složky:</span>
                    <span className="text-slate-200">/Zakazky, /Nabidky, /Fotky</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Container:</span>
                    <span className="text-emerald-400 font-bold">Container Manager</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <Link
                  to="/integrations/synology"
                  className="w-full py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  Otevřít Synology Hub
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                </Link>
              </div>
            </div>

            {/* 1. SQL Database Card */}
            <div className="bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                    <Database className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                    sqlConfig?.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-700/60 text-slate-400 border border-slate-600/50'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sqlConfig?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
                    {sqlConfig?.status === 'connected' ? 'Připojeno' : 'Odpojeno'}
                  </span>
                </div>

                <h3 className="text-sm font-black text-white mb-1">SQL Databáze (Postgres, MySQL, MSSQL)</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Přímé čtení výrobních zakázek, montážních listů a odpovědných techniků z relačních databází.
                </p>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-300 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Server:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[150px]">{sqlConfig?.sqlConfig?.host || 'Nenastaveno'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Poslední sync:</span>
                    <span className="text-slate-200">{sqlConfig?.lastSync ? new Date(sqlConfig.lastSync).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : 'Nikdy'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Položek v CRM:</span>
                    <span className="text-emerald-400 font-bold">{sqlConfig?.recordsCount || 0} zakázek</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('sql')}
                  className="px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                  Konfigurovat
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDisconnect(`int-sql-${orgId}`, sqlConfig?.status || 'disconnected')}
                  className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
                >
                  {sqlConfig?.status === 'connected' ? 'Odpojit' : 'Aktivovat'}
                </button>
              </div>
            </div>

            {/* 2. Google Sheets Card */}
            <div className="bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                    sheetsConfig?.status === 'connected'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-700/60 text-slate-400 border border-slate-600/50'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sheetsConfig?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
                    {sheetsConfig?.status === 'connected' ? 'Připojeno' : 'Odpojeno'}
                  </span>
                </div>

                <h3 className="text-sm font-black text-white mb-1">Google Sheets Tabulky</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Automatické načítání nových řádků z Google Tabulky zakázek nebo poptávek s automatickým syncem.
                </p>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-300 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aktivní list:</span>
                    <span className="text-slate-200 font-bold truncate max-w-[150px]">{sheetsConfig?.sheetsConfig?.sheetName || 'Poptávky 2026'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Poslední sync:</span>
                    <span className="text-slate-200">{sheetsConfig?.lastSync ? new Date(sheetsConfig.lastSync).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : 'Nikdy'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Položek v CRM:</span>
                    <span className="text-emerald-400 font-bold">{sheetsConfig?.recordsCount || 0} zakázek</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('sheets')}
                  className="px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  Konfigurovat
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDisconnect(`int-sheets-${orgId}`, sheetsConfig?.status || 'disconnected')}
                  className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
                >
                  {sheetsConfig?.status === 'connected' ? 'Odpojit' : 'Aktivovat'}
                </button>
              </div>
            </div>

            {/* 3. Excel / CSV Import Studio */}
            <div className="bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Připraveno k nahrání
                  </span>
                </div>

                <h3 className="text-sm font-black text-white mb-1">Excel & CSV Ingestion Studio</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Drag & drop nahrávání .xlsx, .xls a .csv souborů s AI detekcí sloupců a inteligentní deduplikací.
                </p>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-300 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Podpora formátů:</span>
                    <span className="text-slate-200 font-bold">.xlsx, .xls, .csv</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kódování:</span>
                    <span className="text-slate-200 font-bold">UTF-8, Win-1250</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deduplikace:</span>
                    <span className="text-amber-400 font-bold">Aktivní (Tel / Mail)</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('csv')}
                  className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Nahrát soubor & Importovat
                </button>
              </div>
            </div>

            {/* 4. REST API & Inbound Webhooks */}
            <div className="bg-slate-800/70 border border-slate-700/80 hover:border-slate-600 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    <Webhook className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Webhook
                  </span>
                </div>

                <h3 className="text-sm font-black text-white mb-1">REST API & Inbound Webhooks</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Příjem JSON poptávek v reálném čase z webových formulářů, kalkulátorů a vlastních skriptů.
                </p>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 space-y-1.5 text-[11px] text-slate-300 font-mono mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Protokol:</span>
                    <span className="text-purple-400 font-bold">HTTPS POST (JSON)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Autentizace:</span>
                    <span className="text-slate-200">Bearer Token</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Odezva serveru:</span>
                    <span className="text-emerald-400 font-bold">&lt; 20 ms</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal('webhook')}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <Webhook className="w-3.5 h-3.5" />
                  Zobrazit Webhook URL & Token
                </button>
              </div>
            </div>

            {/* 5. Pohoda ERP (Coming Soon / Enterprise) */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between opacity-80">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-xl">
                    P
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">
                    Coming Soon
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-200 mb-1">Stormware POHODA (mServer & XML)</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Přímá obousměrná synchronizace vydaných faktur, skladových položek a adresáře zákazníků.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Enterprise Connector</span>
                <span className="text-xs font-bold text-amber-400/80">Q3 2026</span>
              </div>
            </div>

            {/* 6. Raynet CRM (Coming Soon) */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between opacity-80">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-xl">
                    R
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">
                    Coming Soon
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-200 mb-1">RAYNET CRM Connector</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Synchronizace obchodních příležitostí, kontaktů a fází obchodního trychtýře z Raynetu.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">REST API Sync</span>
                <span className="text-xs font-bold text-amber-400/80">Q3 2026</span>
              </div>
            </div>

            {/* 7. Asseco Helios (Coming Soon) */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between opacity-80">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-xl">
                    H
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wide">
                    Coming Soon
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-200 mb-1">Asseco HELIOS (Orange / Nephrite)</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Napojení na stavební a výrobní moduly pro velké stavební společnosti a generální dodavatele.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Enterprise ERP</span>
                <span className="text-xs font-bold text-amber-400/80">Q4 2026</span>
              </div>
            </div>

          </div>
        </div>

        {/* Real-time Telemetry & Sync Activity Log */}
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
            <div>
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Živý záznam synchronizací & telemetrie (Audit Log)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailní sledování všech operací, časových prodlev a výsledků importů
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'all', label: 'Vše' },
                { id: 'success', label: 'Úspěšné' },
                { id: 'warning', label: 'Varování' },
                { id: 'error', label: 'Chyby' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLogFilter(f.id as any)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    logFilter === f.id
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Stream */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredLogs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 italic font-medium">
                Žádné záznamy pro vybraný filtr.
              </p>
            ) : (
              filteredLogs.map(log => {
                const isSuccess = log.level === 'success';
                const isError = log.level === 'error';
                const isWarn = log.level === 'warning';

                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 rounded-2xl flex items-start justify-between gap-3 transition-colors text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isSuccess && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                        {isError && <XCircle className="w-4 h-4 text-red-400" />}
                        {isWarn && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {log.level === 'info' && <Activity className="w-4 h-4 text-blue-400" />}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-200">{log.message}</p>
                        {log.details && <p className="text-[11px] text-slate-400 font-mono">{log.details}</p>}
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      {log.durationMs !== undefined && (
                        <span className="block text-emerald-400 font-bold">{log.durationMs} ms</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* SQL Connector Modal */}
      <SQLConnectorModal
        isOpen={activeModal === 'sql'}
        onClose={() => setActiveModal(null)}
        initialConfig={sqlConfig?.sqlConfig}
        initialMapping={sqlConfig?.fieldMapping}
        status={sqlConfig?.status}
        lastSync={sqlConfig?.lastSync}
        recordsCount={sqlConfig?.recordsCount}
        onSaveConfig={handleSaveSQLConfig}
        onRunSync={handleRunSQLSync}
      />

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={activeModal === 'sheets'}
        onClose={() => setActiveModal(null)}
        initialConfig={sheetsConfig?.sheetsConfig}
        initialMapping={sheetsConfig?.fieldMapping}
        onSaveConfig={handleSaveSheetsConfig}
        onRunSync={handleRunSheetsSync}
      />

      {/* CSV / Excel Ingestion Modal */}
      <CSVImportModal
        isOpen={activeModal === 'csv'}
        onClose={() => setActiveModal(null)}
        onImportBatch={handleImportCSVBatch}
      />

      {/* Webhook Details Modal */}
      <WebhookDetailsModal
        isOpen={activeModal === 'webhook'}
        onClose={() => setActiveModal(null)}
        config={restConfig}
        organizationId={orgId}
        organizationName={currentOrg?.name || 'Firma'}
        onSendTestPayload={handleSendWebhookTest}
      />

    </div>
  );
};
