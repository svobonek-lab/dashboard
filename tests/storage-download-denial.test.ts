import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyStorageDownloadDenial } from './e2e/storage-download-denial';

test('recognizes explicit Storage HTTP 403 and 404 denial statuses', () => {
  assert.equal(classifyStorageDownloadDenial(403, ''), 'HTTP 403');
  assert.equal(classifyStorageDownloadDenial(404, ''), 'HTTP 404');
});

test('recognizes Supabase legacy HTTP 400 wrappers only when the body carries a 403 or 404 denial', () => {
  assert.equal(
    classifyStorageDownloadDenial(400, JSON.stringify({ statusCode: '404', error: 'not_found', message: 'Object not found' })),
    'HTTP 400 (Storage denial 404: not_found)',
  );
  assert.equal(
    classifyStorageDownloadDenial(400, JSON.stringify({ statusCode: 403, error: 'unauthorized', message: 'denied' })),
    'HTTP 400 (Storage denial 403: unauthorized)',
  );
});

test('does not treat unrelated Storage errors or successful responses as authorization denial', () => {
  assert.equal(classifyStorageDownloadDenial(200, ''), null);
  assert.equal(classifyStorageDownloadDenial(400, JSON.stringify({ error: 'InvalidMimeType', message: 'bad type' })), null);
  assert.equal(classifyStorageDownloadDenial(500, JSON.stringify({ error: 'InternalError' })), null);
  assert.equal(classifyStorageDownloadDenial(400, 'not json'), null);
});
