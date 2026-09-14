import React, { useState } from 'react';
import { SQLConnectionConfig, SQLDriver, SSLMode, FieldMappingConfig } from '@/types/integrations';
import { testSQLConnection, SQLTestResult } from '@/lib/integrations/sqlConnector';
import { SmartFieldMappingModal } from './SmartFieldMappingModal';
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
  Radio
} from 'lucide-react';

interface SQLConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: SQLConnectionConfig;
  initialMapping?: FieldMappingConfig;
  onSaveConfig: (config: SQLConnectionConfig, mapping: FieldMappingConfig) => void;
  onRunSync: (config: SQLConnectionConfig, mapping: FieldMappingConfig) => Promise<any>;
}

export const SQLConnectorModal: React.FC<SQLConnectorModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  initialMapping,
  onSaveConfig,
  onRunSync
}) => {
  const [driver, setDriver] = useState<SQLDriver>(initialConfig?.driver || 'postgresql');
  const [host, setHost] = useState(initialConfig?.host || 'db.vase-firma.cz');
  const [port, setPort] = useState(initialConfig?.port || 5432);
  const [database, setDatabase] = useState(initialConfig?.database || 'projekty_stavby');
  const [username, setUsername] = useState(initialConfig?.username || 'buildflow_readonly');
  const [password, setPassword] = useState(initialConfig?.passwordEncrypted || 'Heslo123!');
  const [showPassword, setShowPassword] = useState(false);
  const [ssl, setSsl] = useState<SSLMode>(initialConfig?.ssl || 'require');
  const [tableName, setTableName] = useState(initialConfig?.tableNameOrQuery || 'v_zakazky_crm');
  const [autoSync, setAutoSync] = useState(initialConfig?.autoSync ?? true);
  const [syncInterval, setSyncInterval] = useState(initialConfig?.syncIntervalMinutes || 60);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SQLTestResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [isMappingOpen, setIsMappingOpen] = useState(false);
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
      const res = await testSQLConnection(config);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: e.message || 'Spojení se nezdařilo.',
        foundProjectsCount: 0,
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
      setSyncFeedback(res.message || 'Synchronizace proběhla úspěšně.');
    } catch (e: any) {
      setSyncFeedback(`Chyba: ${e.message || 'Synchronizace selhala'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center font-bold">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">SQL Database Enterprise Connector</h2>
              <p className="text-xs text-slate-500 font-medium">Přímé napojení na PostgreSQL, MySQL, MS SQL a MariaDB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
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

          {/* Diagnostic Test Output Panel */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in ${
              testResult.success 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                : 'bg-red-50/70 border-red-200 text-red-950'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                  {testResult.message}
                </span>
                {testResult.success && (
                  <span className="px-2 py-0.5 rounded bg-emerald-200/60 font-mono text-[10px] text-emerald-800">
                    {testResult.serverVersion}
                  </span>
                )}
              </div>

              {testResult.success && (
                <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-emerald-800">
                    Nalezeno <strong>{testResult.foundProjectsCount}</strong> aktivních projektů ve vybrané tabulce.
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMappingOpen(true)}
                    className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    Zkontrolovat mapování sloupců ({Object.keys(currentMapping).length})
                  </button>
                </div>
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
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />}
              <span>{isTesting ? 'Testuji spojení...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMappingOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
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
