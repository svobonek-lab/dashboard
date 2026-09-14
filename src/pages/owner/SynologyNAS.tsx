import React, { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { SynologyConfig, SynologyDiscoveredFile, SynologyDatabaseConfig } from '@/types/synology';
import { Lead, Employee } from '@/types';
import { getSynologyConfig, saveSynologyConfig, getSynologyDiscoveredFiles } from '@/lib/synology/storage';
import { runSynologyLiveSync } from '@/lib/synology/syncEngine';
import { SynologyConnectionWizard } from '@/components/synology/SynologyConnectionWizard';
import { DockerComposeModal } from '@/components/synology/DockerComposeModal';
import { DatabaseMappingModal } from '@/components/synology/DatabaseMappingModal';
import { FilePreviewModal } from '@/components/synology/FilePreviewModal';
import { Link } from '@/src/app/router';
import { 
  HardDrive, 
  Server, 
  Database, 
  FolderSync, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Terminal, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  ShieldCheck, 
  ExternalLink, 
  ArrowLeft, 
  Play, 
  Zap, 
  Check, 
  Download, 
  Layers, 
  Search,
  Sparkles,
  Lock,
  Eye,
  Filter,
  ArrowUpRight
} from 'lucide-react';

interface SynologyNASProps {
  leads?: Lead[];
  employees?: Employee[];
  onAddLead?: (lead: Lead) => void;
}

export const SynologyNAS: React.FC<SynologyNASProps> = ({
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

  const orgId = currentOrg?.id || 'default-org';

  const [internalLeads, setInternalLeads] = useState<Lead[]>(propsLeads || []);
  const [internalEmployees, setInternalEmployees] = useState<Employee[]>(propsEmployees || []);
  const [config, setConfig] = useState<SynologyConfig>(getSynologyConfig(orgId));
  const [discoveredFiles, setDiscoveredFiles] = useState<SynologyDiscoveredFile[]>([]);
  const [fileFilter, setFileFilter] = useState<'all' | 'Zakazky' | 'Nabidky' | 'Realizace' | 'Fotky'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDockerModalOpen, setIsDockerModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<SynologyDiscoveredFile | null>(null);

  // Syncing state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const leads = propsLeads || internalLeads;
  const employees = propsEmployees || internalEmployees;

  // Load configuration & files
  const loadData = useCallback(() => {
    const loadedConfig = getSynologyConfig(orgId);
    const loadedFiles = getSynologyDiscoveredFiles(orgId);
    setConfig(loadedConfig);
    setDiscoveredFiles(loadedFiles);
  }, [orgId]);

  useEffect(() => {
    loadData();
    if (!propsLeads) {
      fetchLeads().then(l => setInternalLeads(l)).catch(console.error);
    }
    if (!propsEmployees) {
      fetchEmployees().then(e => setInternalEmployees(e)).catch(console.error);
    }
  }, [loadData, propsLeads, propsEmployees, currentOrg]);

  // Handler for running full live sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await runSynologyLiveSync({
        config,
        existingLeads: leads,
        existingEmployees: employees,
        onSaveLead: async (l) => {
          await saveLead(l);
          if (onAddLead) onAddLead(l);
        },
        onSaveEmployee: saveEmployee
      });

      if (result.success) {
        setSyncFeedback({
          type: 'success',
          message: `Synchronizace dokončena: ${result.importedLeads} nových zakázek, ${result.updatedLeads} aktualizací, ${result.attachedDocumentsCount} PDF a ${result.attachedPhotosCount} fotografií spárováno.`
        });
        loadData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: result.message || 'Při synchronizaci došlo k chybě.'
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err?.message || 'Chyba během synchronizace.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = (updated: SynologyConfig) => {
    setConfig(updated);
    saveSynologyConfig(orgId, updated);
  };

  const handleDisconnect = () => {
    const updated: SynologyConfig = {
      ...config,
      status: 'disconnected',
      dockerConnectorRunning: false
    };
    setConfig(updated);
    saveSynologyConfig(orgId, updated);
    setSyncFeedback({
      type: 'success',
      message: 'Synology NAS byl úspěšně odpojen. Žádná data nebyla smazána.'
    });
  };

  const handleSaveDbConfig = (dbConfig: SynologyDatabaseConfig) => {
    const updated: SynologyConfig = {
      ...config,
      databaseSync: dbConfig
    };
    handleSaveConfig(updated);
  };

  const filteredFiles = discoveredFiles.filter(f => {
    const matchesFilter = fileFilter === 'all' || f.folderCategory === fileFilter;
    const matchesSearch = !searchQuery || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.matchedCustomerName && f.matchedCustomerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.matchedProjectTitle && f.matchedProjectTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link to="/integrations" className="hover:text-brand-primary flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Integrace & Datový Hub
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Synology NAS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 shadow-xs">
              <HardDrive className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Synology NAS Integration Layer
                {config.status === 'connected' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Připojeno (DSM 7.2)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Nepřipojeno
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bezpečné propojení s firemním úložištěm Synology NAS. Automatické párování MariaDB, výkresů a fotodokumentace ze staveb.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDockerModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <Terminal className="w-4 h-4 text-cyan-600" />
            Docker Compose
          </button>
          
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            Konfigurace NAS
          </button>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-brand-primary/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Probíhá synchronizace...' : 'Spustit Live Sync'}
          </button>
        </div>
      </div>

      {/* Sync Feedback Banner */}
      {syncFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between animate-in fade-in duration-150 ${
          syncFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button 
            onClick={() => setSyncFeedback(null)}
            className="text-xs font-bold hover:underline opacity-80"
          >
            Zavřít
          </button>
        </div>
      )}

      {/* NAS Telemetry & Hardware Status Hero Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card 1: Hardware & DSM */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Model a operační systém</span>
            <span className="p-1.5 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100">
              <Server className="w-4 h-4" />
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{config.detectedModel || 'Synology DS923+'}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{config.dsmVersion || 'DSM 7.2.2-72806'}</p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Sériové číslo:</span>
            <span className="font-mono font-bold text-slate-700">{config.serialNumberMasked || '2290S***918A'}</span>
          </div>
        </div>

        {/* Card 2: Synology Services */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aktivní služby NAS</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-600" />
                Container Manager (Docker)
              </span>
              <span className="font-bold text-emerald-600 font-mono text-[11px]">BĚŽÍ</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-amber-600" />
                MariaDB 10 ({config.databaseSync.table})
              </span>
              <span className="font-bold text-emerald-600 font-mono text-[11px]">PŘIPOJENO</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 flex items-center gap-1.5">
                <FolderSync className="w-3.5 h-3.5 text-blue-600" />
                File Station (4 složky)
              </span>
              <span className="font-bold text-emerald-600 font-mono text-[11px]">SLEDOVÁNO</span>
            </div>
          </div>
        </div>

        {/* Card 3: Synchronization Rhythm */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Automatický Live Sync</span>
            <span className="p-1.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">Každých 5 minut</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Poslední sync: {config.lastSync ? new Date(config.lastSync).toLocaleTimeString('cs-CZ') : 'Před chvílí'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Inotify Watcher:</span>
            <span className="font-bold text-emerald-600">Reaktivní Webhook</span>
          </div>
        </div>

        {/* Card 4: Hardware Metrics */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Zatížení NAS</span>
            <span className="p-1.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
              <Cpu className="w-4 h-4" />
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>CPU (Ryzen R1600)</span>
                <span>{config.cpuUsagePercent || 12}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${config.cpuUsagePercent || 12}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                <span>RAM (32GB ECC)</span>
                <span>{config.ramUsagePercent || 28}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${config.ramUsagePercent || 28}%` }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Main Section: Database Sync & Shared Folders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Discovered Files from Synology Shared Folders */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          
          {/* Header & Controls */}
          <div className="p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <FolderSync className="w-5 h-5 text-cyan-600" />
                  Sdílené složky Synology (/Zakazky, /Nabidky, /Realizace, /Fotky)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Soubory jsou automaticky párovány k zakázkám na základě názvu složky nebo čísla projektu.
                </p>
              </div>
              
              <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold self-start sm:self-auto">
                {discoveredFiles.length} nalezených souborů
              </span>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
                {(['all', 'Zakazky', 'Nabidky', 'Realizace', 'Fotky'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFileFilter(f)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                      fileFilter === f
                        ? 'bg-white text-slate-900 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f === 'all' ? 'Všechny složky' : `/${f}`}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hledat výkres, PDF, fotku..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Files List Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Soubor na NAS</th>
                  <th className="py-3 px-4">Složka</th>
                  <th className="py-3 px-4">Přiřazeno k zakázce</th>
                  <th className="py-3 px-4">Velikost</th>
                  <th className="py-3 px-4 text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            file.fileType === 'photo'
                              ? 'bg-purple-50 text-purple-600 border border-purple-100'
                              : file.fileType === 'excel'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-red-50 text-red-600 border border-red-100'
                          }`}>
                            {file.fileType === 'photo' ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : file.fileType === 'excel' ? (
                              <FileSpreadsheet className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block group-hover:text-brand-primary transition-colors">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-xs">
                              {file.path}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {file.folderCategory}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {file.matchedCustomerName ? (
                          <div>
                            <span className="font-semibold text-slate-800 block text-[11px]">
                              {file.matchedCustomerName}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate block max-w-[160px]">
                              {file.matchedProjectTitle}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Nepřiřazeno</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          Náhled
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <FolderSync className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium text-xs">Nebyly nalezeny žádné soubory odpovídající filtru.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* Right Column (1 Col): Database & Docker Connector Card */}
        <div className="space-y-6">
          
          {/* MariaDB / PostgreSQL Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">MariaDB / PostgreSQL</h4>
                  <p className="text-xs text-slate-500">Přímé čtení tabulky na NAS</p>
                </div>
              </div>
              <button
                onClick={() => setIsDbModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors text-xs font-bold flex items-center gap-1"
                title="Nastavit mapování"
              >
                <SlidersHorizontal className="w-4 h-4 text-cyan-600" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Databáze:</span>
                <span className="font-bold text-slate-800">{config.databaseSync.database}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Tabulka:</span>
                <span className="font-bold text-cyan-700">{config.databaseSync.table}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Port DB:</span>
                <span className="font-bold text-slate-800">{config.databaseSync.port}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Stav:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Aktivní čtení
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsDbModalOpen(true)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              Upravit mapování sloupců
            </button>
          </div>

          {/* Docker Container Manager Info */}
          <div className="bg-[#0C111D] text-white p-6 rounded-3xl border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Docker Connector</h4>
                  <p className="text-xs text-slate-400">Synology Container Manager</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                {config.connectorVersion || 'v2.4.1'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Konektor běží jako lehký kontejner v paměti NAS. Sleduje změny ve složkách <code className="bg-slate-800 text-cyan-300 px-1 py-0.5 rounded">/volume1/Zakazky</code> a zasílá aktualizace do BuildFlow.
            </p>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                <span className="block font-mono">Image: ghcr.io/buildflow-os/synology</span>
              </div>
              <button
                onClick={() => setIsDockerModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Compose
              </button>
            </div>
          </div>

          {/* Security Guarantee Box */}
          <div className="p-5 rounded-3xl bg-cyan-50/70 border border-cyan-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-cyan-950">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              Izolace dat organizace
            </div>
            <p className="text-cyan-900 leading-relaxed text-[11px]">
              Všechna data jsou vázána na ID organizace <code className="bg-cyan-100 px-1 py-0.5 rounded text-cyan-950 font-mono">{orgId}</code>. Žádné přístupové údaje ani hesla k NAS neopouštějí váš lokální hardware.
            </p>
          </div>

        </div>

      </div>

      {/* Modals */}
      <SynologyConnectionWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        config={config}
        organizationId={orgId}
        onSaveConfig={handleSaveConfig}
        onDisconnect={handleDisconnect}
      />

      <DockerComposeModal
        isOpen={isDockerModalOpen}
        onClose={() => setIsDockerModalOpen(false)}
        config={config}
        organizationId={orgId}
      />

      <DatabaseMappingModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        databaseConfig={config.databaseSync}
        onSave={handleSaveDbConfig}
      />

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

    </div>
  );
};
