export async function loadLeadAttachmentLists<TNote, TFile>(
  getNotes: () => Promise<TNote[]>,
  getFiles: () => Promise<TFile[]>,
): Promise<{ notes: TNote[] | null; files: TFile[] | null; error: string }> {
  const [notes, files] = await Promise.allSettled([getNotes(), getFiles()]);
  const failures: string[] = [];
  if (notes.status === 'rejected') failures.push('Poznámky se nepodařilo načíst.');
  if (files.status === 'rejected') failures.push('Soubory se nepodařilo načíst.');
  return {
    notes: notes.status === 'fulfilled' ? notes.value : null,
    files: files.status === 'fulfilled' ? files.value : null,
    error: failures.join(' '),
  };
}

export type ScopedRows<T> = { scope: string; rows: T[] };

export function visibleScopedRows<T>(stored: ScopedRows<T>, scope: string): T[] {
  return stored.scope === scope ? stored.rows : [];
}

export function mergeScopedRows<T>(stored: ScopedRows<T>, scope: string, loaded: T[] | null): ScopedRows<T> {
  return { scope, rows: loaded ?? visibleScopedRows(stored, scope) };
}
