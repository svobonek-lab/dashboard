import { createImportFingerprint, parseCsvDryRun } from '../lib/integrations/pilotImport.js';
import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';
import type { FieldMappingConfig, TargetFieldType } from '../src/shared/model/integrations.js';

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const STAGING_IMPORT_SUPABASE_URL = 'https://xwzweltjvreqhjpbjrxa.supabase.co';

const TARGET_FIELDS: Record<TargetFieldType, string> = {
  customerName: 'customer',
  title: 'title',
  price: 'value',
  customerPhone: 'phone',
  customerEmail: 'email',
  city: 'address',
  address: 'address',
  preferredDate: 'scheduled_at',
  description: 'description',
  priority: 'priority',
  status: 'status',
  assignedEmployeeName: 'assigned_employee_name',
  ignore: '',
};

function validateMapping(headers: string[], candidate: unknown): FieldMappingConfig {
  if (candidate === undefined || candidate === null) return {};
  if (typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Mapování CSV musí být objekt.');
  }
  const allowed = new Set(Object.keys(TARGET_FIELDS));
  const headerSet = new Set(headers);
  const usedTargets = new Set<string>();
  const mapping: FieldMappingConfig = {};
  for (const [source, rawTarget] of Object.entries(candidate as Record<string, unknown>)) {
    if (!headerSet.has(source)) throw new Error(`Sloupec ${source} v CSV neexistuje.`);
    if (typeof rawTarget !== 'string' || !allowed.has(rawTarget)) {
      throw new Error(`Cíl mapování pro ${source} není podporovaný.`);
    }
    if (rawTarget !== 'ignore' && usedTargets.has(rawTarget)) {
      throw new Error(`Cílové pole ${rawTarget} je namapované vícekrát.`);
    }
    if (rawTarget !== 'ignore') usedTargets.add(rawTarget);
    mapping[source] = rawTarget as TargetFieldType;
  }
  return mapping;
}

function normalizeImportRows(rows: Record<string, string>[], mapping: FieldMappingConfig) {
  return rows.map((row, index) => {
    const normalized: Record<string, string | number> = {
      source_record_id: row.id || row._id || row.external_id || String(index + 1),
    };
    for (const [sourceColumn, targetField] of Object.entries(mapping || {})) {
      const target = TARGET_FIELDS[targetField];
      if (!target || normalized[target] !== undefined) continue;
      const value = String(row[sourceColumn] ?? '').trim();
      if (!value) continue;
      if (target === 'value') {
        const numeric = Number(value.replace(/[^0-9,.-]/g, '').replace(',', '.'));
        if (Number.isFinite(numeric)) normalized[target] = numeric;
      } else {
        normalized[target] = value;
      }
    }
    return normalized;
  });
}

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
    const importTargetUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    if (process.env.APP_IMPORT_WORKER_ENABLED !== 'true' || importTargetUrl !== STAGING_IMPORT_SUPABASE_URL) {
      res.status(503).json({
        error: 'Import worker není na tomto deploymentu aktivovaný.',
        code: 'IMPORT_WORKER_DISABLED',
      });
      return;
    }
    const companyId = String(body.companyId || '').trim();
    const fileName = String(body.fileName || 'import.csv').trim().slice(0, 160);
    const csv = typeof body.csv === 'string' ? body.csv : '';
    const token = String(req.headers?.authorization || req.headers?.Authorization || '')
      .replace(/^Bearer\s+/i, '').trim();
    if (!companyId || !csv || !token) {
      res.status(400).json({ error: 'Import vyžaduje companyId, CSV a přihlášený účet.' });
      return;
    }
    if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
      res.status(413).json({ error: 'CSV soubor je příliš velký. Limit importu je 2 MB.' });
      return;
    }
    const supabaseUrl = importTargetUrl;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) {
      res.status(503).json({ error: 'Import worker nemá nakonfigurované stagingové Supabase klíče.', code: 'IMPORT_WORKER_CONFIG_MISSING' });
      return;
    }
    const authClient = createServerlessSupabaseClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) {
      res.status(401).json({ error: 'Přihlášení pro import není platné.' });
      return;
    }
    const serviceClient = createServerlessSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: member, error: memberError } = await serviceClient
      .from('app_members')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', authData.user.id)
      .eq('active', true)
      .maybeSingle();
    if (memberError || member?.role !== 'owner') {
      res.status(403).json({ error: 'Import může spustit pouze aktivní majitel firmy.' });
      return;
    }
    const preview = parseCsvDryRun(csv);
    let mapping: FieldMappingConfig;
    try {
      mapping = validateMapping(preview.headers, body.mapping);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Neplatné mapování CSV.', code: 'IMPORT_MAPPING_INVALID' });
      return;
    }
    if (Object.values(mapping).every((target) => target === 'ignore')) {
      res.status(400).json({ error: 'Před importem namapujte alespoň jedno pole.', code: 'IMPORT_MAPPING_REQUIRED' });
      return;
    }
    const normalizedRows = normalizeImportRows(preview.rows, mapping);
    if (normalizedRows.some((row) => !row.customer && !row.title)) {
      res.status(400).json({ error: 'Každý řádek musí mít zákazníka nebo název zakázky.', code: 'IMPORT_ROW_INVALID' });
      return;
    }
    const fingerprint = createImportFingerprint(companyId, fileName, csv, mapping);
    if (body.fingerprint && body.fingerprint !== fingerprint) {
      res.status(409).json({ error: 'Fingerprint importu neodpovídá náhledu.', code: 'IMPORT_FINGERPRINT_MISMATCH' });
      return;
    }
    const { data, error } = await serviceClient.rpc('app_import_leads', {
      p_company_id: companyId,
      p_actor_id: authData.user.id,
      p_rows: normalizedRows,
      p_file_name: fileName,
      p_fingerprint: fingerprint,
    });
    if (error) {
      res.status(502).json({ error: 'Stagingový import selhal.', code: 'IMPORT_WORKER_ERROR' });
      return;
    }
    res.status(200).json({ ...data, imported: true, fingerprint, fileName });
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
  let mapping: FieldMappingConfig;
  try {
    mapping = validateMapping(preview.headers, body.mapping);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Neplatné mapování CSV.', code: 'IMPORT_MAPPING_INVALID' });
    return;
  }
  res.status(200).json({
    ...preview,
    companyId,
    fileName,
    rows: preview.rows.length,
    fingerprint: createImportFingerprint(companyId, fileName, csv, mapping),
    expiresInMinutes: 30,
  });
}
