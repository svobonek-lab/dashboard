import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSignedPreviews, runLeadFileDelete, runLeadFileUpload, requireOneDeletedRow } from '../src/shared/api/data/leadAttachmentOperations';

test('one failed signed preview leaves the other file and its metadata available', async () => {
  const rows = [{ id: 'a', storage_path: 'a.pdf' }, { id: 'b', storage_path: 'b.pdf' }];
  const result = await resolveSignedPreviews(rows, async path => path === 'a.pdf'
    ? { data: { signedUrl: 'https://example.test/a' }, error: null }
    : { data: null, error: new Error('expired') });
  assert.deepEqual(result.map(row => [row.id, row.previewUrl]), [['a', 'https://example.test/a'], ['b', null]]);
});

test('zero-row delete is denied, even when PostgREST reports no error', () => {
  assert.throws(() => requireOneDeletedRow({ data: [], error: null }, 'denied'), /denied/);
  assert.doesNotThrow(() => requireOneDeletedRow({ data: [{ id: 'a' }], error: null }, 'denied'));
});

test('zero-row file DELETE never removes Storage', async () => {
  let removed = false;
  await assert.rejects(runLeadFileDelete(
    async () => ({ data: [], error: null }),
    async () => { removed = true; return { error: null }; },
    'file-id',
  ), /nelze smazat/);
  assert.equal(removed, false);
});

test('Storage delete failure after metadata deletion reports partial failure and file ID', async () => {
  await assert.rejects(runLeadFileDelete(
    async () => ({ data: [{ id: 'file-id' }], error: null }),
    async () => ({ error: new Error('offline') }),
    'file-id',
  ), /úklid.*file-id/i);
});

test('Storage delete returning no removed object also reports partial failure', async () => {
  await assert.rejects(runLeadFileDelete(
    async () => ({ data: [{ id: 'file-id' }], error: null }),
    async () => ({ data: [], error: null }),
    'file-id',
  ), /úklid.*file-id/i);
});

test('interrupted upload attempts exact-path cleanup and creates no metadata', async () => {
  const calls: string[] = [];
  await assert.rejects(runLeadFileUpload({
    createSignedUploadUrl: async () => ({ data: { token: 'private' }, error: null }),
    uploadToSignedUrl: async () => { calls.push('upload'); throw new Error('offline'); },
    insertMetadata: async () => { calls.push('insert'); return { data: { id: 'file-id' }, error: null }; },
    createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/file' }, error: null }),
    remove: async path => { calls.push(`remove ${path}`); return { error: null }; },
  }, 'exact/path', 'file-id'), /nahrát/);
  assert.deepEqual(calls, ['upload', 'remove exact/path']);
});

test('metadata rejection with failed cleanup reports possible orphan', async () => {
  await assert.rejects(runLeadFileUpload({
    createSignedUploadUrl: async () => ({ data: { token: 'private' }, error: null }),
    uploadToSignedUrl: async () => ({ error: null }),
    insertMetadata: async () => ({ data: null, error: new Error('RLS') }),
    createSignedUrl: async () => ({ data: null, error: null }),
    remove: async () => ({ error: new Error('offline') }),
  }, 'exact/path', 'file-id'), /úklid.*file-id/i);
});

test('signed upload URL failure does not upload or insert', async () => {
  let touched = false;
  await assert.rejects(runLeadFileUpload({
    createSignedUploadUrl: async () => ({ data: null, error: new Error('offline') }),
    uploadToSignedUrl: async () => { touched = true; return { error: null }; },
    insertMetadata: async () => { touched = true; return { data: null, error: null }; },
    createSignedUrl: async () => ({ data: null, error: null }),
    remove: async () => { touched = true; return { error: null }; },
  }, 'exact/path', 'file-id'), /Podepsaný odkaz/);
  assert.equal(touched, false);
});

test('post-insert preview failure still returns saved file metadata', async () => {
  const saved = await runLeadFileUpload({
    createSignedUploadUrl: async () => ({ data: { token: 'private' }, error: null }),
    uploadToSignedUrl: async () => ({ error: null }),
    insertMetadata: async () => ({ data: { id: 'file-id' }, error: null }),
    createSignedUrl: async () => ({ data: null, error: new Error('offline') }),
    remove: async () => ({ error: null }),
  }, 'exact/path', 'file-id');
  assert.deepEqual(saved, { row: { id: 'file-id' }, previewUrl: null });
});
