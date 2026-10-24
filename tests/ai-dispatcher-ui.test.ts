import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getLeadSourceBadge } from '../src/app/leadSource';

test('lead source badges identify AI inbox and website widget', () => {
  assert.deepEqual(getLeadSourceBadge('ai_inbox'), { icon: '🤖', label: 'AI zpracováno' });
  assert.deepEqual(getLeadSourceBadge('widget'), { icon: '🌐', label: 'Z webu' });
  assert.equal(getLeadSourceBadge('manual'), null);
});

test('Kanban renders the source badge from persisted lead source', () => {
  const kanban = readFileSync(new URL('../src/features/manage-leads/ui/LeadsKanban.tsx', import.meta.url), 'utf8');
  assert.match(kanban, /getLeadSourceBadge\(lead\.source\)/);
  assert.match(kanban, /sourceBadge\.label/);
});

test('integrations expose AI inbox and widget while database connector stays Enterprise-only', () => {
  const integrations = readFileSync(new URL('../src/pages/owner/Integrations.tsx', import.meta.url), 'utf8');
  assert.match(integrations, /AI Dispečer \(e-mail\)/);
  assert.match(integrations, /incomingLeadLoading/);
  assert.match(integrations, /Unikátní webhook URL/);
  assert.match(integrations, /Kopírovat webhook AI dispečera/);
  assert.doesNotMatch(integrations, /fallbackIncomingLeadUrl/);
  assert.match(integrations, /\/api\/incoming-lead-config\?companyId=/);
  assert.match(integrations, /widget\.js\?org_id=/);
  assert.match(integrations, /currentOrg\?\.slug/);
  assert.match(integrations, /encodeURIComponent\(publicTenantKey\)/);
  assert.match(integrations, /isEnterprise/);
  assert.match(integrations, /isEnterprise &&/);
  const widget = readFileSync(new URL('../public/widget.js', import.meta.url), 'utf8');
  assert.match(widget, /searchParams\.get\(['"]org_id['"]\)/);
});
