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
