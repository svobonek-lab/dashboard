import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('normal application and standalone public demo routes both render inside an error boundary', () => {
  const application = source('../src/app/startApplication.tsx');
  const demoBranch = application.match(/if \(isPublicDemo\) \{([\s\S]*?)return;/)?.[1] || '';
  const workspaceBranch = application.match(/root\.render\(<StrictMode><ErrorBoundary><OrganizationProvider><App \/><\/OrganizationProvider><\/ErrorBoundary><\/StrictMode>\)/)?.[0] || '';

  assert.match(demoBranch, /<ErrorBoundary><PublicDemoWorkspace \/><\/ErrorBoundary>/);
  assert.match(workspaceBranch, /<ErrorBoundary>/);
});

test('organization data request failures render a user-readable retry notice instead of empty content', () => {
  const app = source('../src/app/App.tsx');

  assert.match(app, /setDataLoadError\('Zakázky a zaměstnance se nepodařilo načíst\./);
  assert.match(app, /dataLoadError[\s\S]{0,350}role="alert"/);
  assert.match(app, /Zkusit znovu/);
});

test('error fallback does not display raw exception details or claim Sentry delivery unconditionally', () => {
  const boundary = source('../src/app/providers/ErrorBoundary.tsx');
  const renderedFallback = boundary.slice(boundary.indexOf('public render()'));

  assert.match(renderedFallback, /Zkuste stránku obnovit/);
  assert.doesNotMatch(renderedFallback, /\{this\.state\.error\?\.message/);
  assert.doesNotMatch(renderedFallback, /zaznamenána do telemetrie Sentry/);
});
