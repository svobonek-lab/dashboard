import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ownerLayout = readFileSync(new URL('../src/widgets/workspace-shell/ui/OwnerLayout.tsx', import.meta.url), 'utf8');
const pilotScope = readFileSync(new URL('../src/shared/lib/pilotScope.ts', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const commandPalette = readFileSync(new URL('../src/widgets/command-palette/ui/CommandPalette.tsx', import.meta.url), 'utf8');

test('owner navigation and owner routing do not expose the sales cockpit', () => {
  assert.doesNotMatch(ownerLayout, /Prodejní cockpit|path:\s*['"]\/sales/);
  assert.doesNotMatch(pilotScope, /['"]\/sales['"]/);
  assert.doesNotMatch(app, /pathname\s*===\s*['"]\/sales['"]|SalesWorkspace/);
  assert.doesNotMatch(commandPalette, /['"]\/sales['"]|Prodejní přehled/);
});
