const denialCodes = new Set(['unauthorized', 'not found', 'object not found', 'accessdenied']);

/**
 * Supabase Storage can wrap an RLS 403/404 in a legacy HTTP 400 response.
 * Accept that wrapper only when its JSON body explicitly identifies a denial.
 */
export function classifyStorageDownloadDenial(status: number, responseBody: string): string | null {
  if (status === 403 || status === 404) return `HTTP ${status}`;
  if (status !== 400) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(responseBody);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const body = payload as Record<string, unknown>;
  const innerStatus = Number(body.statusCode ?? body.status);
  const code = String(body.error ?? body.code ?? '').replace(/[_-]/g, ' ').toLowerCase();
  if (![403, 404].includes(innerStatus) || !denialCodes.has(code)) return null;

  return `HTTP 400 (Storage denial ${innerStatus}: ${code.replace(/ /g, '_')})`;
}
