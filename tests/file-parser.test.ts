import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUploadedFile } from '../lib/integrations/fileParser';

test('pilot import rejects Excel files and directs the operator to reviewed CSV', async () => {
  const file = new File(['not-an-excel-workbook'], 'zakazky.xlsx');
  await assert.rejects(
    () => parseUploadedFile(file),
    /Pilot podporuje pouze CSV/,
  );
});
