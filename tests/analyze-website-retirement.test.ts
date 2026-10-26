import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path: string) => readFile(new URL(path, root), 'utf8');

test('retired website analyzer is outside Vercel discovery and has no runtime callers', async () => {
  await assert.rejects(access(new URL('api/analyze-website.ts', root)));
  const [archive, vite, gemini, incomingLead, vercel] = await Promise.all([
    read('docs/archive/analyze-website.ts.txt'),
    read('vite.config.ts'),
    read('lib/gemini.ts'),
    read('api/incoming-lead.ts'),
    read('vercel.json'),
  ]);

  assert.match(archive, /Archived source for the retired website analyzer/);
  assert.doesNotMatch(vite, /analyze-website|analyzeWebsiteHandler/);
  assert.doesNotMatch(gemini, /analyzeWebsiteWithGemini|\/api\/analyze-website/);
  assert.match(incomingLead, /from ['"]\.\.\/lib\/gemini\.js['"]/);
  assert.match(gemini, /generateGeminiResponse/);
  assert.doesNotMatch(vercel, /analyze-website/);
});
