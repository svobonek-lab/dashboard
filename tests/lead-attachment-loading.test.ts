import assert from 'node:assert/strict';
import test from 'node:test';
import { loadLeadAttachmentLists } from '../src/features/lead-files/model/loadAttachmentLists';

test('file list failure preserves successfully loaded notes', async () => {
  const loaded = await loadLeadAttachmentLists(
    async () => [{ id: 'note' }],
    async () => { throw new Error('file query failed'); },
  );
  assert.deepEqual(loaded.notes, [{ id: 'note' }]);
  assert.equal(loaded.files, null);
  assert.match(loaded.error, /soubory/i);
});

test('note list failure preserves successfully loaded files', async () => {
  const loaded = await loadLeadAttachmentLists(
    async () => { throw new Error('note query failed'); },
    async () => [{ id: 'file' }],
  );
  assert.equal(loaded.notes, null);
  assert.deepEqual(loaded.files, [{ id: 'file' }]);
  assert.match(loaded.error, /poznámky/i);
});
