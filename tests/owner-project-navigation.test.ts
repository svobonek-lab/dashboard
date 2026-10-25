import assert from 'node:assert/strict';
import test from 'node:test';
import { openOwnerProjectLead } from '../src/pages/owner/projects';
import type { Lead } from '../types';

test('support projects open inside the support workspace', () => {
  const events: string[] = [];
  const lead = { id: 'lead-1' } as Lead;
  openOwnerProjectLead(lead, (selected) => events.push(`selected:${selected.id}`), (path) => events.push(`navigate:${path}`), '/support/session-1/leads');
  assert.deepEqual(events, ['selected:lead-1', 'navigate:/support/session-1/leads']);
});

test('normal owner projects preserve the owner leads destination', () => {
  let destination = '';
  openOwnerProjectLead({ id: 'lead-1' } as Lead, () => undefined, (path) => { destination = path; });
  assert.equal(destination, '/leads');
});
