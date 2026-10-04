import React, { useState } from 'react';
import { CheckCircle2, Database, FileSpreadsheet, LockKeyhole, UploadCloud } from 'lucide-react';
import { CSVImportModal } from '@/components/integrations/CSVImportModal';
import { useOrganization } from '@/context/OrganizationContext';
import { supabase } from '@/lib/supabase';
import type { Employee, Lead } from '@/types';
import type { FieldMappingConfig } from '@/types/integrations';

interface IntegrationsProps {
  leads?: Lead[];
  employees?: Employee[];
  onAddLead?: (lead: Lead) => void;
}

export const Integrations: React.FC<IntegrationsProps> = () => {
  const { currentOrg, fetchLeads } = useOrganization();
  const [isCsvOpen, setIsCsvOpen] = useState(false);

  const importCsv = async (
    _rows: Record<string, unknown>[],
    mapping: FieldMappingConfig,
    _deduplicate: boolean,
    _updateExisting: boolean,
    source: { fileName: string; csv: string },
  ) => {
    if (!currentOrg?.id) throw new Error('Import vyžaduje aktivní firmu.');
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) throw new Error('Před importem se znovu přihlaste.');

    const dryRun = await fetch('/api/import-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'dry_run', companyId: currentOrg.id, fileName: source.fileName, csv: source.csv, mapping }),
    });
    const preview = await dryRun.json();
    if (!dryRun.ok) throw new Error(preview?.error || 'Kontrolní náhled importu selhal.');

    const commit = await fetch('/api/import-leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode: 'commit', companyId: currentOrg.id, fileName: source.fileName, csv: source.csv, mapping, fingerprint: preview.fingerprint }),
    });
    const result = await commit.json();
    if (!commit.ok) throw new Error(result?.error || 'Import se nepodařilo bezpečně uložit.');
    await fetchLeads();
    const created = Number(result?.created ?? result?.inserted ?? result?.imported_count ?? 0);
    const updated = Number(result?.updated ?? result?.updated_count ?? 0);
    return { ...result, message: `Import byl uložen. Nové záznamy: ${created}, aktualizované: ${updated}.` };
  };

  return (
    <div className="workspace-page mx-auto max-w-5xl">
      <header className="workspace-page-header">
        <div><p className="workspace-kicker">Data firmy</p><h1 className="workspace-title">Import a napojení</h1><p className="workspace-subtitle">Pro první pilot používáme kontrolovaný CSV import bez zápisu zpět do původního systému firmy.</p></div>
        <button type="button" onClick={() => setIsCsvOpen(true)} className="workspace-primary-action inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold"><UploadCloud className="h-4 w-4" /> Nahrát CSV</button>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.25fr_.75fr]">
        <article className="workspace-panel p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FileSpreadsheet className="h-5 w-5" /></span>
          <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">Kontrolovaný CSV import</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Nejdřív zkontrolujete sloupce a jejich mapování. Server následně ověří firmu, oprávnění majitele a fingerprint souboru. Opakovaný import nevytvoří stejné záznamy podruhé.</p>
          <ul className="mt-5 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {['Náhled před zápisem', 'Mapování polí', 'Kontrola duplicit', 'Auditovatelný fingerprint'].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{item}</li>)}
          </ul>
          <button type="button" onClick={() => setIsCsvOpen(true)} className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Vybrat CSV soubor</button>
        </article>

        <aside className="workspace-panel p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><LockKeyhole className="h-5 w-5" /></span>
          <h2 className="mt-5 text-base font-semibold text-slate-950">Další konektory po pilotu</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Přímé SQL, Google Sheets a obousměrnou synchronizaci zapojujeme až po samostatném bezpečnostním ověření konkrétního zdroje.</p>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Database className="h-4 w-4" /><span>Individuální návrh napojení</span></div>
        </aside>
      </section>

      <CSVImportModal isOpen={isCsvOpen} onClose={() => setIsCsvOpen(false)} onImportBatch={importCsv} />
    </div>
  );
};
