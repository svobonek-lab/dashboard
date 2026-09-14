import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedFileResult {
  fileName: string;
  fileSize: number;
  format: 'csv' | 'xlsx' | 'xls';
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  delimiter?: string;
}

/**
 * Parses CSV or Excel file buffer / string
 */
export async function parseUploadedFile(file: File): Promise<ParsedFileResult> {
  const fileName = file.name;
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (!jsonData || jsonData.length === 0) {
      throw new Error('Nahraný Excel soubor neobsahuje žádná data nebo řádky.');
    }

    const headers = Object.keys(jsonData[0] || {});

    return {
      fileName,
      fileSize: file.size,
      format: fileName.endsWith('.xlsx') ? 'xlsx' : 'xls',
      headers,
      rows: jsonData,
      totalRows: jsonData.length
    };
  }

  // Handle CSV
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error('Soubor CSV neobsahuje žádné platné řádky.'));
          return;
        }

        const headers = results.meta.fields || Object.keys(results.data[0] || {});
        resolve({
          fileName,
          fileSize: file.size,
          format: 'csv',
          headers,
          rows: results.data,
          totalRows: results.data.length,
          delimiter: results.meta.delimiter
        });
      },
      error: (err) => {
        reject(new Error(`Chyba při čtení CSV souboru: ${err.message}`));
      }
    });
  });
}
