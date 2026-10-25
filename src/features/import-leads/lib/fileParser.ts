import Papa from 'papaparse';

export interface ParsedFileResult {
  fileName: string;
  fileSize: number;
  format: 'csv';
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  delimiter?: string;
}

/**
 * Parses the reviewed CSV pilot format.
 */
export async function parseUploadedFile(file: File): Promise<ParsedFileResult> {
  const fileName = file.name;
  if (!fileName.toLowerCase().endsWith('.csv')) {
    throw new Error('Pilot podporuje pouze CSV. Excel nejprve exportujte do CSV a znovu zkontrolujte mapování.');
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
