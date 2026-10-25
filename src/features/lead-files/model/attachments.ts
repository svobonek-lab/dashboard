import type { Lead } from '../../../entities/lead';
import { sanitizeUploadName, validateLeadUpload } from '../../../shared/api/data/leadFilePolicy';
export { buildLeadFilePath, normalizeLeadNote, sanitizeUploadName, validateLeadUpload, MAX_LEAD_FILE_BYTES } from '../../../shared/api/data/leadFilePolicy';

export type EmployeeJobFilter = 'today' | 'upcoming' | 'completed';

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
