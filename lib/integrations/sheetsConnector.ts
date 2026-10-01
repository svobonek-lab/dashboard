import type { GoogleSheetsConfig, FieldMappingConfig } from '@/types/integrations';
import type { Lead } from '@/types';

export interface GoogleSheetsPreviewResult {
  success: boolean;
  spreadsheetTitle: string;
  availableSheets: string[];
  selectedSheet: string;
  headers: string[];
  previewRows: Record<string, any>[];
  totalRowCount: number;
  message: string;
}

export function extractSpreadsheetId(input: string): string {
  return input?.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || input?.trim() || '';
}

const unavailable = 'Google Sheets synchronizace není v pilotu dostupná. Exportujte tabulku jako CSV a použijte import s kontrolou dat.';

export async function testGoogleSheetsConnection(_config: GoogleSheetsConfig): Promise<GoogleSheetsPreviewResult> {
  return {
    success: false, spreadsheetTitle: '', availableSheets: [], selectedSheet: '',
    headers: [], previewRows: [], totalRowCount: 0, message: unavailable,
  };
}

export async function executeGoogleSheetsSync(
  _config: GoogleSheetsConfig, _mapping: FieldMappingConfig, _organizationId: string
): Promise<{ leads: Lead[] }> {
  throw new Error(unavailable);
}
