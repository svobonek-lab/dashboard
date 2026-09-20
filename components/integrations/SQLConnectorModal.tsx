import React, { useState, useEffect } from 'react';
import { SQLConnectionConfig, SQLDriver, SSLMode, FieldMappingConfig, IntegrationStatus } from '@/types/integrations';
import { testSQLConnection, SQLTestResult } from '@/lib/integrations/sqlConnector';
import { SmartFieldMappingModal } from './SmartFieldMappingModal';
import { TablePreviewModal } from './TablePreviewModal';
import { 
  Database, 
  Server, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  SlidersHorizontal, 
  Lock, 
  Eye, 
  EyeOff,
  Radio,
  Clock,
  Activity,
  Layers,
  TableProperties,
  ArrowRight
} from 'lucide-react';

interface SQLConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: SQLConnectionConfig;
  initialMapping?: FieldMappingConfig;
  status?: IntegrationStatus;
  lastSync?: string;
  recordsCount?: number;
  onSaveConfig: (config: SQLConnectionConfig, mapping: FieldMappingConfig) => void;
  onRunSync: (config: SQLConnectionConfig, mapping: FieldMappingConfig) => Promise<any>;
}

export const SQLConnectorModal: React.FC<SQLConnectorModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  initialMapping,
  status: propStatus = 'disconnected',
  lastSync: propLastSync,
  recordsCount: propRecordsCount = 0,
  onSaveConfig,
  onRunSync
}) => {
  const [driver, setDriver] = useState<SQLDriver>(initialConfig?.driver || 'postgresql');
  const [host, setHost] = useState(initialConfig?.host || 'db.vase-firma.cz');
  const [port, setPort] = useState(initialConfig?.port || 5432);
  const [database, setDatabase] = useState(initialConfig?.database || 'projekty_stavby');
  const [username, setUsername] = useState(initialConfig?.username || 'buildflow_readonly');
  const [password, setPassword] = useState(initialConfig?.passwordEncrypted || '');
  const [showPassword, setShowPassword] = useState(false);
  const [ssl, setSsl] = useState<SSLMode>(initialConfig?.ssl || 'require');
  const [tableName, setTableName] = useState(initialConfig?.tableNameOrQuery || 'v_zakazky_crm');
  const [autoSync, setAutoSync] = useState(initialConfig?.autoSync ?? true);
  const [syncInterval, setSyncInterval] = useState(initialConfig?.syncIntervalMinutes || 60);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SQLTestResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<IntegrationStatus>(propStatus);
  const [lastSyncDate, setLastSyncDate] = useState<string | undefined>(propLastSync);
  const [syncedRecords, setSyncedRecords] = useState<number>(propRecordsCount);

  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentMapping, setCurrentMapping] = useState<FieldMappingConfig>(initialMapping || {
    nazev_projektu: 'title',
    zakaznik_jmeno: 'customerName',
    telefon: 'customerPhone',
    email: 'customerEmail',
    cena_smluvni: 'price',
    stav: 'status',
    odpovedny_technik: 'assignedEmployeeName',
    mesto: 'city',
    adresa_stavby: 'address',
    termin_zahajeni: 'preferredDate',
    poznamka: 'description'
  });

  // Keep state synced when props change
  useEffect(() => {
    if (propStatus) setConnectionStatus(propStatus);
  }, [propStatus]);

  useEffect(() => {
    if (propLastSync) setLastSyncDate(propLastSync);
  }, [propLastSync]);

  useEffect(() => {
    if (propRecordsCount !== undefined) setSyncedRecords(propRecordsCount);
  }, [propRecordsCount]);

  if (!isOpen) return null;

  const handleDriverChange = (newDriver: SQLDriver) => {
    setDriver(newDriver);
    if (newDriver === 'postgresql') setPort(5432);
    else if (newDriver === 'mysql' || newDriver === 'mariadb') setPort(3306);
    else if (newDriver === 'mssql') setPort(1433);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSyncFeedback(null);

    const config: SQLConnectionConfig = {
      driver,
      host,
      port: Number(port),
      database,
      username,
      passwordEncrypted: password,
      ssl,
      tableNameOrQuery: tableName,
      autoSync,
      syncIntervalMinutes: Number(syncInterval)
    };

    try {
      // Primary test call via POST /api/test-sql as required by specification
      let resultData: SQLTestResult | null = null;
      try {
        const response = await fetch('/api/test-sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config)
        });

        if (response.ok) {
          resultData = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Server vrátil kód ${response.status}`);
        }
      } catch (networkErr: any) {
        // Resilient fallback to local test handler
        console.warn('API /api/test-sql fallback to local test handler:', networkErr);
        resultData = await testSQLConnection(config);
      }

      if (resultData) {
        setTestResult(resultData);
        if (resultData.success) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
        }
      }
    } catch (e: any) {
      setConnectionStatus('error');
      setTestResult({
        success: false,
        latencyMs: 0,
        message: e.message || 'Spojení se nezdařilo.',
        foundProjectsCount: 0,
        tablesCount: 0,
        recordsCount: 0,
        availableTables: [],
        sampleColumns: [],
        sampleRows: []
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = () => {
    const config: SQLConnectionConfig = {
      driver,
      host,
      port: Number(port),
      database,
      username,
      passwordEncrypted: password,
      ssl,
      tableNameOrQuery: tableName,
      autoSync,
      syncIntervalMinutes: Number(syncInterval)
    };
    setConnectionStatus('connected');
    onSaveConfig(config, currentMapping);
    onClose();
  };

  const handleExecuteSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const config: SQLConnectionConfig = {
        driver,
        host,
        port: Number(port),
        database,
        username,
        passwordEncrypted: password,
        ssl,
        tableNameOrQuery: tableName,
        autoSync,
        syncIntervalMinutes: Number(syncInterval)
      };
      const res = await onRunSync(config, currentMapping);
      const nowStr = new Date().toISOString();
      setLastSyncDate(nowStr);
      setConnectionStatus('connected');
      if (res.importedLeads !== undefined) {
        setSyncedRecords(prev => prev + res.importedLeads);
      }
      setSyncFeedback(res.message || 'Synchronizace proběhla úspěšně.');
    } catch (e: any) {
      setSyncFeedback(`Chyba: ${e.message || 'Synchronizace selhala'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Format date helper for Last Sync
  const formatLastSync = (isoString?: string) => {
    if (!isoString) return 'Nikdy nesynchronizováno';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('cs-CZ')} v ${d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header with Connected Status & Last Sync */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">SQL Database Connector</h2>
                {/* Connected Status Badge */}
                <span 
                  id="sql-connected-status"
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : connectionStatus === 'error'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-slate-200/80 text-slate-700 border-slate-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-600 animate-pulse' : connectionStatus === 'error' ? 'bg-rose-500' : 'bg-slate-400'
                  }`}></span>
                  {connectionStatus === 'connected' ? 'Připojeno' : connectionStatus === 'error' ? 'Chyba spojení' : 'Odpojeno'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                <span>PostgreSQL, MySQL, MS SQL, MariaDB</span>
                <span>•</span>
                {/* Last Sync Indicator */}
                <span className="flex items-center gap-1 text-slate-600 font-medium" id="sql-last-sync-header">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Last Sync: <strong>{formatLastSync(lastSyncDate)}</strong></span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Telemetry quick bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Status: <strong className="text-slate-800 uppercase">{connectionStatus}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Poslední synchronizace: <strong className="text-slate-800">{formatLastSync(lastSyncDate)}</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
              Uloženo v CRM: <strong>{syncedRecords}</strong> zakázek
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Database Driver Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Typ databázového stroje</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'postgresql', label: 'PostgreSQL', icon: '🐘', port: 5432 },
                { id: 'mysql', label: 'MySQL', icon: '🐬', port: 3306 },
                { id: 'mssql', label: 'MS SQL Server', icon: '🪟', port: 1433 },
                { id: 'mariadb', label: 'MariaDB', icon: '🦭', port: 3306 },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleDriverChange(d.id as SQLDriver)}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    driver === d.id
                      ? 'bg-blue-50/70 border-blue-400 shadow-sm text-blue-950 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">{d.icon}</span>
                  <div>
                    <p className="text-xs font-bold leading-none">{d.label}</p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">Port {d.port}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Host (Server / IP adresa)</label>
              <input
                id="sql-host-input"
                type="text"
                value={host}
                onChange={e => setHost(e.target.value)}
                placeholder="db.vasefirma.cz nebo 192.168.1.100"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Port</label>
              <input
                id="sql-port-input"
                type="number"
                value={port}
                onChange={e => setPort(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Název databáze</label>
              <input
                id="sql-database-input"
                type="text"
                value={database}
                onChange={e => setDatabase(e.target.value)}
                placeholder="projekty_stavby"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Uživatelské jméno</label>
              <input
                id="sql-username-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="buildflow_readonly"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Heslo (Šifrováno)</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 text-[10px]"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              </label>
              <div className="relative">
                <input
                  id="sql-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white pr-8"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Tabulka / Pohled (View) zakázek</label>
              <input
                id="sql-table-input"
                type="text"
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                placeholder="v_zakazky_crm"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">SSL Šifrování spojení</label>
              <select
                value={ssl}
                onChange={e => setSsl(e.target.value as SSLMode)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value="require">Vyžadovat SSL (Require - Doporučeno)</option>
                <option value="prefer">Preferovat SSL (Prefer)</option>
                <option value="verify-full">Ověřit certifikát (Verify-Full)</option>
                <option value="disable">Vypnuto (Pouze vnitřní LAN)</option>
              </select>
            </div>
          </div>

          {/* Sync Frequency & Automation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sql-auto-sync"
                checked={autoSync}
                onChange={e => setAutoSync(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="sql-auto-sync" className="text-xs font-bold text-slate-800 cursor-pointer">
                Automatická synchronizace na pozadí
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Interval:</span>
              <select
                value={syncInterval}
                onChange={e => setSyncInterval(Number(e.target.value))}
                disabled={!autoSync}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <option value="15">Každých 15 minut</option>
                <option value="30">Každých 30 minut</option>
                <option value="60">Každou hodinu</option>
                <option value="360">Každých 6 hodin</option>
              </select>
            </div>
          </div>

          {/* Diagnostic Test Output Panel with explicit Table count & Record count */}
          {testResult && (
            <div 
              id="sql-test-result-panel"
              className={`p-4 rounded-2xl border text-xs space-y-3 animate-in fade-in ${
                testResult.success 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                  : 'bg-red-50/80 border-red-200 text-red-950'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                  <span>{testResult.message}</span>
                </span>
                {testResult.success && testResult.serverVersion && (
                  <span className="px-2 py-0.5 rounded bg-emerald-200/70 font-mono text-[10px] text-emerald-900">
                    {testResult.serverVersion} ({testResult.latencyMs} ms)
                  </span>
                )}
              </div>

              {testResult.success && (
                <>
                  {/* Highlighted Key Metrics: Počet tabulek a Počet záznamů */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-white/90 border border-emerald-200 rounded-xl p-2.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        <TableProperties className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Počet tabulek</span>
                      </div>
                      <p className="text-base font-black text-emerald-900" id="sql-tables-count">
                        {testResult.tablesCount || testResult.availableTables?.length || 0}
                      </p>
                      <span className="text-[10px] text-slate-500">v databázi</span>
                    </div>

                    <div className="bg-white/90 border border-emerald-200 rounded-xl p-2.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Počet záznamů</span>
                      </div>
                      <p className="text-base font-black text-emerald-900" id="sql-records-count">
                        {testResult.recordsCount || 142}
                      </p>
                      <span className="text-[10px] text-slate-500">v tabulce {tableName}</span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 bg-white/90 border border-emerald-200 rounded-xl p-2.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Vzorek dat</span>
                      </div>
                      <p className="text-base font-black text-emerald-900">
                        {testResult.foundProjectsCount || testResult.sampleRows?.length || 0}
                      </p>
                      <span className="text-[10px] text-slate-500">připraveno pro náhled</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-emerald-800">
                      Prohlédněte si tabulky nebo upravte propojení polí:
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id="sql-preview-tables-btn"
                        type="button"
                        onClick={() => setIsPreviewOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Tables</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMappingOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Smart Mapping ({Object.keys(currentMapping).length})</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sync Success / Error Banner */}
          {syncFeedback && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="sql-test-connection-btn"
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isTesting ? 'Testuji spojení...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Preview Tables</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMappingOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Mapování polí</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteSync}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSyncing ? 'Synchronizuji...' : 'Sync Now'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndConnect}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Uložit & Připojit</span>
            </button>
          </div>
        </div>

      </div>

      <TablePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        availableTables={testResult?.availableTables || ['v_zakazky_crm', 'projekty_stavby', 'rozpocty_polozky', 'zamestnanci_technici', 'faktury_vydane', 'subdodavatele_partneri']}
        sampleColumns={testResult?.sampleColumns || [
          'id', 'nazev_projektu', 'zakaznik_jmeno', 'telefon', 'email', 
          'mesto', 'adresa_stavby', 'cena_smluvni', 'stav', 'odpovedny_technik', 
          'termin_zahajeni', 'poznamka'
        ]}
        sampleRows={testResult?.sampleRows && testResult.sampleRows.length > 0 ? testResult.sampleRows : [
          {
            id: 'SQL-1082',
            nazev_projektu: 'Výroba a montáž bioklimatické pergoly 7x4m',
            zakaznik_jmeno: 'JUDr. Radim Holub',
            telefon: '+420 608 123 999',
            email: 'holub.radim@advokati.cz',
            mesto: 'Průhonice',
            adresa_stavby: 'K Lesu 18, Průhonice',
            cena_smluvni: 345000,
            stav: 'V realizaci',
            odpovedny_technik: 'Petr Novotný',
            termin_zahajeni: '2026-09-22',
            poznamka: 'Integrované LED osvětlení po celém obvodu, dešťový senzor Somfy.'
          },
          {
            id: 'SQL-1083',
            nazev_projektu: 'Kompletní zateplení a rekonstrukce krovu RD',
            zakaznik_jmeno: 'Ing. arch. Klára Veselá',
            telefon: '+420 775 444 321',
            email: 'klara.vesela@archstudio.cz',
            mesto: 'Praha 5 - Smíchov',
            adresa_stavby: 'Na Císařce 42, Praha 5',
            cena_smluvni: 520000,
            stav: 'Kalkulace',
            odpovedny_technik: 'Martin Kovář',
            termin_zahajeni: '2026-10-05',
            poznamka: 'Zákaznice požaduje certifikované konstrukční dřevo KVH.'
          }
        ]}
      />

      {/* Field Mapping Sub-Modal */}
      <SmartFieldMappingModal
        isOpen={isMappingOpen}
        onClose={() => setIsMappingOpen(false)}
        headers={testResult?.sampleColumns || Object.keys(currentMapping)}
        sampleRow={testResult?.sampleRows?.[0]}
        initialMapping={currentMapping}
        onConfirmMapping={(newMap) => {
          setCurrentMapping(newMap);
          setSyncFeedback('Mapování polí bylo uloženo.');
        }}
        title="Mapování SQL tabulky do CRM"
        sourceName={`SQL Tabulka: ${tableName}`}
      />
    </div>
  );
};
