import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildLeadFilePath,
  filterEmployeeJobs,
  normalizeLeadNote,
  sanitizeUploadName,
} from '../src/app/leadAttachments';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('lead attachment input is bounded and storage paths are tenant and lead scoped', () => {
  const companyId = '11111111-2222-4333-8444-444444444444';
  const leadId = '22222222-3333-4444-8555-555555555555';
  const fileId = '33333333-4444-4555-8666-666666666666';

  assert.equal(normalizeLeadNote('  Kontrola krovu hotová.  '), 'Kontrola krovu hotová.');
  assert.throws(() => normalizeLeadNote(' '.repeat(10)), /prázdná/i);
  assert.throws(() => normalizeLeadNote('x'.repeat(4001)), /4000/);
  assert.equal(sanitizeUploadName('../foto stavby?.JPG'), 'foto-stavby-.jpg');
  assert.equal(
    buildLeadFilePath(companyId, leadId, fileId, '../foto stavby?.JPG'),
    `${companyId}/${leadId}/${fileId}-foto-stavby-.jpg`,
  );
});

test('employee job tabs filter persisted jobs instead of only changing tab styling', () => {
  const jobs = [
    { id: '1', status: 'In Progress', preferredDate: '2026-10-13T09:00:00.000Z' },
    { id: '2', status: 'Quote', preferredDate: '2026-10-14T09:00:00.000Z' },
    { id: '3', status: 'Completed', preferredDate: '2026-10-12T09:00:00.000Z' },
  ] as any;
  const now = new Date('2026-10-13T12:00:00.000Z');

  assert.deepEqual(filterEmployeeJobs(jobs, 'today', now).map((job) => job.id), ['1']);
  assert.deepEqual(filterEmployeeJobs(jobs, 'upcoming', now).map((job) => job.id), ['2']);
  assert.deepEqual(filterEmployeeJobs(jobs, 'completed', now).map((job) => job.id), ['3']);
});

test('cloud repository persists notes and signed uploads without local attachment fallback', () => {
  const repository = read('../src/shared/api/data/SupabaseRepository.ts');
  const types = read('../src/shared/api/data/types.ts');

  assert.match(types, /getLeadNotes\(/);
  assert.match(types, /addLeadNote\(/);
  assert.match(types, /getLeadFiles\(/);
  assert.match(types, /uploadLeadFile\(/);
  assert.match(repository, /from\('app_lead_notes'\)/);
  assert.match(repository, /from\('app_lead_files'\)/);
  assert.match(repository, /createSignedUploadUrl/);
  assert.match(repository, /uploadToSignedUrl/);
  assert.doesNotMatch(repository, /mock_lead_(notes|files)|lead_attachment_fallback/i);
});

test('owner and employee attachment screens reload records from the repository', () => {
  const documents = read('../src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx');
  const photos = read('../src/pages/employee/photos/ui/Photos.tsx');
  const app = read('../src/app/App.tsx');

  for (const source of [documents, photos]) {
    assert.match(source, /crmRepo\.getLeadFiles/);
    assert.match(source, /crmRepo\.uploadLeadFile/);
  }
  assert.match(documents, /crmRepo\.getLeadNotes/);
  assert.match(documents, /crmRepo\.addLeadNote/);
  assert.match(photos, /resizeImageForUpload/);
  assert.doesNotMatch(photos, /readAsDataURL|base64Url/);
  assert.doesNotMatch(app, /EmployeeChecklistPage|\/employee\/checklist/);
});

test('staging-missing attachment schema keeps owner and employee UI honest and idle', () => {
  const documents = read('../src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx');
  const photos = read('../src/pages/employee/photos/ui/Photos.tsx');

  for (const source of [documents, photos]) {
    assert.match(source, /isLeadAttachmentsEnabled\(import\.meta\.env\)/);
    assert.match(source, /Přílohy budou brzy k dispozici/);
    assert.match(source, /if \(attachmentsEnabled\) void load/);
  }
});

test('employee pages stay honest: no fake upload success, schedule text, or checklist persistence', () => {
  const photos = read('../src/pages/employee/photos/ui/Photos.tsx');
  const jobs = read('../src/pages/employee/jobs/ui/Jobs.tsx');
  const readiness = read('../src/widgets/workspace-readiness/model/workspaceReadiness.ts');

  assert.match(photos, /await crmRepo\.uploadLeadFile/);
  assert.match(photos, /await loadFiles/);
  assert.doesNotMatch(jobs, /Dnes 13:30|Zítra 08:00/);
  assert.match(jobs, /filterEmployeeJobs\(myJobs, filter/);
  assert.doesNotMatch(jobs, /navigate\('\/employee\/checklist'\)/);
  assert.doesNotMatch(readiness, /href: '\/employee\/checklist'/);
});

test('notes and attachments require an explicit flag and the declared staging project', async () => {
  const { isLeadAttachmentsEnabled } = await import('../src/features/lead-files/model/availability');
  const staging = {
    VITE_LEAD_NOTES_FILES_ENABLED: 'true',
    VITE_STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
    VITE_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  };
  assert.equal(isLeadAttachmentsEnabled({}), false);
  assert.equal(isLeadAttachmentsEnabled({ ...staging, VITE_LEAD_NOTES_FILES_ENABLED: 'false' }), false);
  assert.equal(isLeadAttachmentsEnabled({ ...staging, VITE_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co' }), false);
  assert.equal(isLeadAttachmentsEnabled({ ...staging, VITE_STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv' }), false);
  assert.equal(isLeadAttachmentsEnabled(staging), true);
});
