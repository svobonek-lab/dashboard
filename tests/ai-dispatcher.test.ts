import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildAiLeadPrompt,
  createIncomingLeadHandler,
  parseAiLeadResponse,
} from '../api/incoming-lead';

function responseRecorder() {
  return {
    code: 0,
    body: null as any,
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

test('AI lead parser accepts only the strict bounded response contract', () => {
  assert.deepEqual(parseAiLeadResponse(JSON.stringify({
    is_lead: true,
    client_name: ' Jan Novák ',
    phone: '+420 777 123 456',
    job_type: 'Rekonstrukce střechy',
    description: 'Prosím o nabídku na novou krytinu.',
    location: 'Brno',
  })), {
    is_lead: true,
    client_name: 'Jan Novák',
    phone: '+420 777 123 456',
    job_type: 'Rekonstrukce střechy',
    description: 'Prosím o nabídku na novou krytinu.',
    location: 'Brno',
  });
  assert.throws(() => parseAiLeadResponse('{"is_lead":"yes"}'), /neplatný/i);
  assert.throws(() => parseAiLeadResponse(JSON.stringify({
    is_lead: true, client_name: null, phone: null, job_type: 'Střecha',
    description: 'Nová krytina', location: null, unsafe_extra: 'ignored?',
  })), /kontraktu/i);
});

test('AI prompt requests only the approved JSON fields', () => {
  const prompt = buildAiLeadPrompt();
  assert.match(prompt, /"is_lead"/);
  assert.match(prompt, /"client_name"/);
  assert.match(prompt, /striktní JSON/i);
  assert.doesNotMatch(prompt, /markdown/i);
});

test('server-side Gemini module uses Node ESM compatible local imports', () => {
  const source = readFileSync(new URL('../lib/gemini.ts', import.meta.url), 'utf8');
  assert.match(source, /from '\.\/supabase\.js'/);
  assert.match(source, /from '\.\.\/types\/index\.js'/);
});

test('incoming mail that is not a lead is ignored without a database write', async () => {
  let writes = 0;
  const handler = createIncomingLeadHandler({
    classify: async () => JSON.stringify({ is_lead: false, client_name: null, phone: null, job_type: '', description: '', location: null }),
    persist: async () => { writes += 1; return 'unexpected'; },
  });
  const res = responseRecorder();
  await handler({ method: 'POST', body: { text_body: 'Děkuji za fakturu.', org_id: '11111111-1111-4111-8111-111111111111' }, headers: {} }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { status: 'ignored' });
  assert.equal(writes, 0);
});

test('incoming lead is persisted once as ai_inbox in the requested company', async () => {
  let saved: any;
  const handler = createIncomingLeadHandler({
    classify: async () => JSON.stringify({
      is_lead: true, client_name: 'Eva Malá', phone: '+420 777 000 111',
      job_type: 'Nová koupelna', description: 'Kompletní rekonstrukce.', location: 'Olomouc',
    }),
    persist: async (input) => { saved = input; return '22222222-2222-4222-8222-222222222222'; },
  });
  const res = responseRecorder();
  await handler({
    method: 'POST',
    body: { text_body: 'Prosím o nabídku nové koupelny v Olomouci.', org_id: '11111111-1111-4111-8111-111111111111' },
    headers: { 'x-idempotency-key': 'mail-provider-message-1' },
  }, res);
  assert.equal(res.code, 201);
  assert.equal(res.body.status, 'created');
  assert.equal(saved.companyId, '11111111-1111-4111-8111-111111111111');
  assert.equal(saved.source, 'ai_inbox');
  assert.equal(saved.status, 'new');
  assert.equal(saved.requestKey, 'mail-provider-message-1');
});

test('incoming lead fails closed for invalid company or oversized mail', async () => {
  const handler = createIncomingLeadHandler({ classify: async () => '{}', persist: async () => 'x' });
  const badOrg = responseRecorder();
  await handler({ method: 'POST', body: { text_body: 'Nabídka', org_id: 'company-a' }, headers: {} }, badOrg);
  assert.equal(badOrg.code, 400);

  const tooLarge = responseRecorder();
  await handler({ method: 'POST', body: { text_body: 'x'.repeat(50_001), org_id: '11111111-1111-4111-8111-111111111111' }, headers: {} }, tooLarge);
  assert.equal(tooLarge.code, 413);
});

test('incoming lead rejects a request that fails webhook authorization', async () => {
  let classified = false;
  const handler = createIncomingLeadHandler({
    authorize: () => false,
    classify: async () => { classified = true; return '{}'; },
    persist: async () => 'x',
  });
  const res = responseRecorder();
  await handler({ method: 'POST', body: { text_body: 'Nabídka', org_id: '11111111-1111-4111-8111-111111111111' }, headers: {} }, res);
  assert.equal(res.code, 401);
  assert.equal(classified, false);
});

test('incoming lead accepts the company id from the configured webhook URL', async () => {
  let companyId = '';
  const handler = createIncomingLeadHandler({
    authorize: () => true,
    classify: async () => JSON.stringify({ is_lead: true, client_name: null, phone: null, job_type: 'Střecha', description: 'Nová krytina', location: null }),
    persist: async (input) => { companyId = input.companyId; return '22222222-2222-4222-8222-222222222222'; },
  });
  const res = responseRecorder();
  await handler({
    method: 'POST', body: { text_body: 'Prosím nabídku.' }, headers: {},
    url: '/api/incoming-lead?org_id=11111111-1111-4111-8111-111111111111&token=signed',
  }, res);
  assert.equal(res.code, 201);
  assert.equal(companyId, '11111111-1111-4111-8111-111111111111');
});
