import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { exportCompanyData } from '../api/exportCompanyData';

export const CompanyDataExport: React.FC<{ companyId: string; role?: string }> = ({ companyId, role }) => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (role !== 'owner') return null;

  const download = async () => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await exportCompanyData(companyId, role);
      const url = URL.createObjectURL(new Blob([result.csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `stavbaflow-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setMessage(result.historyAvailable
        ? 'Export poptávek, týmu a dostupné historie se stáhl.'
        : 'Export poptávek a týmu se stáhl. Ověřitelná historie není v tomto prostředí dostupná.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export se nepodařilo připravit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="workspace-panel space-y-4 p-5 sm:p-7" aria-labelledby="company-export-title">
      <div>
        <h2 id="company-export-title" className="text-sm font-semibold text-slate-950">Export firemních dat</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Stáhněte poptávky, tým a ověřitelnou historii dostupnou pro váš účet. Export neobsahuje interní identifikátory, přístupové údaje, tokeny ani hashe.</p>
      </div>
      <button type="button" disabled={busy || !companyId} onClick={() => void download()} className="workspace-secondary-action inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold disabled:opacity-60">
        <Download className="h-4 w-4" />{busy ? 'Připravuji export…' : 'Stáhnout CSV'}
      </button>
      {message && <p role="status" className="text-xs font-medium text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
    </section>
  );
};
