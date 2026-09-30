import { createImportFingerprint, parseCsvDryRun } from '../lib/integrations/pilotImport';

const MAX_CSV_BYTES = 2 * 1024 * 1024;

/**
 * Server-side import boundary. Dry-run is intentionally stateless and does
 * not touch Supabase or the customer's source database. Commit remains gated
 * until the reviewed app_import_leads service contract is deployed to staging.
 */
export default async function importLeadsHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const body = req.body || {};
  const mode = body.mode || 'dry_run';
  if (mode === 'commit') {
    res.status(501).json({
      error: 'Import zápis čeká na stagingový app_import_leads worker kontrakt.',
      code: 'IMPORT_WORKER_CONTRACT_PENDING',
    });
    return;
  }
  if (mode !== 'dry_run') {
    res.status(400).json({ error: 'Neznámý režim importu.' });
    return;
  }

  const companyId = String(body.companyId || '').trim();
  const fileName = String(body.fileName || 'import.csv').trim().slice(0, 160);
  const csv = typeof body.csv === 'string' ? body.csv : '';
  if (!companyId || !csv) {
    res.status(400).json({ error: 'Dry-run vyžaduje companyId a obsah CSV.' });
    return;
  }
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
    res.status(413).json({ error: 'CSV soubor je příliš velký. Limit dry-run je 2 MB.' });
    return;
  }

  const preview = parseCsvDryRun(csv);
  res.status(200).json({
    ...preview,
    companyId,
    fileName,
    rows: preview.rows.length,
    fingerprint: createImportFingerprint(companyId, fileName, csv),
    expiresInMinutes: 30,
  });
}
