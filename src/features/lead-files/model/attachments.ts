import type { Lead } from '../../../entities/lead';

export type EmployeeJobFilter = 'today' | 'upcoming' | 'completed';

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
  const safe = normalized
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.{2,}/g, '.')
    .slice(0, 180)
    .toLowerCase();
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

function sameLocalDay(value: string | undefined, now: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    && date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export function filterEmployeeJobs(jobs: Lead[], filter: EmployeeJobFilter, now = new Date()): Lead[] {
  if (filter === 'completed') return jobs.filter((job) => job.status === 'Completed');
  if (filter === 'today') return jobs.filter((job) => job.status !== 'Completed' && job.status !== 'Lost' && sameLocalDay(job.preferredDate, now));
  return jobs.filter((job) => job.status !== 'Completed' && job.status !== 'Lost' && !sameLocalDay(job.preferredDate, now));
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fotku se nepodařilo načíst pro bezpečné zmenšení.')); };
    image.src = url;
  });
}

export async function resizeImageForUpload(file: File, maxDimension = 1600): Promise<File> {
  validateLeadUpload(file);
  if (!file.type.startsWith('image/')) return file;

  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  if (scale === 1 && file.size <= 2 * 1024 * 1024) return file;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Prohlížeč neumí fotku bezpečně zmenšit.');
  context.drawImage(image, 0, 0, width, height);
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/webp';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.82));
  if (!blob) throw new Error('Fotku se nepodařilo zmenšit.');
  const baseName = sanitizeUploadName(file.name).replace(/\.[^.]+$/, '');
  const resized = new File([blob], `${baseName}.${outputType === 'image/png' ? 'png' : 'webp'}`, { type: outputType, lastModified: file.lastModified });
  validateLeadUpload(resized);
  return resized;
}
