type Result<T> = { data: T | null; error: unknown };
type ErrorResult = { error: unknown };
type RemoveResult = ErrorResult & { data?: unknown[] | null };

export function requireOneDeletedRow(result: Result<Array<{ id: string }>>, message: string): void {
  if (result.error || result.data?.length !== 1) throw new Error(message);
}

export async function resolveSignedPreviews<T extends { storage_path: string }>(
  rows: T[],
  sign: (path: string) => Promise<Result<{ signedUrl: string }>>,
): Promise<Array<T & { previewUrl: string | null }>> {
  return Promise.all(rows.map(async row => {
    try {
      const signed = await sign(row.storage_path);
      return { ...row, previewUrl: signed.error ? null : signed.data?.signedUrl || null };
    } catch {
      return { ...row, previewUrl: null };
    }
  }));
}

export async function runLeadFileDelete(
  deleteMetadata: () => Promise<Result<Array<{ id: string }>>>,
  remove: () => Promise<RemoveResult>,
  fileId: string,
): Promise<void> {
  requireOneDeletedRow(await deleteMetadata(), 'Soubor nelze smazat. Majitel jej může smazat kdykoliv, autor do 15 minut.');
  try {
    const removed = await remove();
    if (removed.error || removed.data?.length !== 1) throw removed.error || new Error('No object removed.');
  } catch {
    throw new Error(`Záznam byl odstraněn, ale úklid souboru selhal. Předejte správci ID ${fileId}.`);
  }
}

interface UploadOperations<T> {
  createSignedUploadUrl: () => Promise<Result<{ token: string }>>;
  uploadToSignedUrl: (token: string) => Promise<ErrorResult>;
  insertMetadata: () => Promise<Result<T>>;
  createSignedUrl: () => Promise<Result<{ signedUrl: string }>>;
  remove: (path: string) => Promise<RemoveResult>;
}

export async function runLeadFileUpload<T>(
  operations: UploadOperations<T>,
  storagePath: string,
  fileId: string,
): Promise<{ row: T; previewUrl: string | null }> {
  const signedUpload = await operations.createSignedUploadUrl();
  if (signedUpload.error || !signedUpload.data?.token) throw new Error('Podepsaný odkaz pro nahrání se nepodařilo vytvořit.');

  const cleanup = async (message: string, objectExpected: boolean): Promise<never> => {
    try {
      const removed = await operations.remove(storagePath);
      if (removed.error || (objectExpected && removed.data?.length !== 1)) throw removed.error || new Error('No object removed.');
    } catch {
      throw new Error(`${message} Úklid souboru mohl selhat; předejte správci ID ${fileId}.`);
    }
    throw new Error(message);
  };

  let uploaded: ErrorResult;
  try {
    uploaded = await operations.uploadToSignedUrl(signedUpload.data.token);
  } catch {
    return await cleanup('Soubor se nepodařilo nahrát do soukromého úložiště.', false);
  }
  if (uploaded.error) return await cleanup('Soubor se nepodařilo nahrát do soukromého úložiště.', false);

  let inserted: Result<T>;
  try {
    inserted = await operations.insertMetadata();
  } catch {
    return await cleanup('Soubor byl odmítnut databází a nebyl uložen.', true);
  }
  if (inserted.error || !inserted.data) return await cleanup('Soubor byl odmítnut databází a nebyl uložen.', true);

  let previewUrl: string | null = null;
  try {
    const preview = await operations.createSignedUrl();
    if (!preview.error) previewUrl = preview.data?.signedUrl || null;
  } catch { /* Persisted metadata remains usable without a preview. */ }
  return { row: inserted.data, previewUrl };
}
