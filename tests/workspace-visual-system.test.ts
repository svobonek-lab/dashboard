import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('clean workspace visual system defines the shared product language', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /--workspace-canvas:\s*#f7f8fa/i);
  assert.match(css, /--workspace-primary:\s*#2563eb/i);
  assert.match(css, /\.workspace-shell/);
  assert.match(css, /\.workspace-primary-action/);
  assert.match(css, /prefers-reduced-motion/);
});
