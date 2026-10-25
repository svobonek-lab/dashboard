const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);
export const MAX_LEAD_FILE_BYTES = 15 * 1024 * 1024;

export function normalizeLeadNote(body: string): string {
  const normalized = body.trim();
  if (!normalized) throw new Error('Poznámka nesmí být prázdná.');
  if (normalized.length > 4000) throw new Error('Poznámka může mít nejvýše 4000 znaků.');
  return normalized;
}

export function sanitizeUploadName(name: string): string {
  const leaf = name.replace(/\\/g, '/').split('/').pop() || 'soubor';
  const normalized = leaf.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const safe = normalized.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.{2,}/g, '.').slice(0, 180).toLowerCase();
  return safe || 'soubor';
}

export function buildLeadFilePath(companyId: string, leadId: string, fileId: string, fileName: string): string {
  for (const [label, id] of [['firma', companyId], ['zakázka', leadId], ['soubor', fileId]] as const) {
    if (!UUID_PATTERN.test(id)) throw new Error(`Neplatný identifikátor: ${label}.`);
  }
  return `${companyId}/${leadId}/${fileId}-${sanitizeUploadName(fileName)}`;
}

export function validateLeadUpload(file: Pick<File, 'name' | 'type' | 'size'>): void {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) throw new Error('Povolené jsou JPG, PNG, WebP, HEIC a PDF.');
  if (file.size < 1 || file.size > MAX_LEAD_FILE_BYTES) throw new Error('Soubor musí mít nejvýše 15 MB.');
  if (!sanitizeUploadName(file.name)) throw new Error('Soubor nemá platný název.');
}
