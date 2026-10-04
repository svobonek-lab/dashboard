import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

test('clean workspace visual system defines the shared product language', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(css, /--workspace-canvas:\s*#f5f5f7/i);
  assert.match(css, /--workspace-primary:\s*#2563eb/i);
  assert.match(css, /\.workspace-shell/);
  assert.match(css, /\.workspace-page/);
  assert.match(css, /\.workspace-metric/);
  assert.match(css, /\.workspace-primary-action/);
  assert.match(css, /prefers-reduced-motion/);
});

test('pilot dashboards expose only real product actions', () => {
  const owner = readFileSync(new URL('../features/OwnerDashboard.tsx', import.meta.url), 'utf8');
  const employee = readFileSync(new URL('../features/EmployeeDashboard.tsx', import.meta.url), 'utf8');
  const employeeLayout = readFileSync(new URL('../src/layouts/EmployeeLayout.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(owner, /onNavigateTab\(['"](?:quotes|analytics)['"]\)/);
  assert.doesNotMatch(employee, /setTimeout|unsplash\.com|automaticky vygenerována|>Sync \(/i);
  assert.match(employee, /onUpdateLeadStatus/);
  assert.match(employee, /Otevřít detail/);
  assert.match(employeeLayout, /Moje přiřazené zakázky/);
  assert.doesNotMatch(employeeLayout, /GPS|počasí|Polojasno|Hlasový záznam|Checklist|dispečink/i);
});

test('configured login is onboarding-led rather than fake self-service provisioning', () => {
  const login = readFileSync(new URL('../components/LoginPage.tsx', import.meta.url), 'utf8');
  assert.match(login, /Firemní prostor připravujeme při onboardingu/);
  assert.match(login, /Jedno přihlášení, správný dashboard/);
});

test('new company onboarding stays inside the verified pilot scope', () => {
  const onboarding = readFileSync(new URL('../features/OnboardingChecklist.tsx', import.meta.url), 'utf8');
  assert.match(onboarding, /4 kroky k první zakázce/);
  assert.doesNotMatch(onboarding, /POHODA|marže|automatické přijímání|Označit jako hotové/i);
  assert.doesNotMatch(onboarding, /tenantCache|manualChecks/);
});

test('pilot integration surface exposes CSV worker without fake live connectors', () => {
  const integrations = readFileSync(new URL('../src/pages/owner/Integrations.tsx', import.meta.url), 'utf8');
  assert.match(integrations, /\/api\/import-leads/);
  assert.match(integrations, /Kontrolovaný CSV import/);
  assert.doesNotMatch(integrations, /executeSQLSync|executeGoogleSheetsSync|handleSyncAll|WebhookDetailsModal/);
});

test('owner settings persist only reviewed company fields through app schema', () => {
  const context = readFileSync(new URL('../context/OrganizationContext.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../src/pages/owner/Settings.tsx', import.meta.url), 'utf8');
  assert.match(context, /from\(['"]app_companies['"]\)\.update\(appRecord\)/);
  assert.match(settings, /Kontaktní údaje/);
  assert.doesNotMatch(settings, /White Label ZIP|API token|služeb a integračních/i);
});

test('team page never fakes assignment or SMS delivery', () => {
  const team = readFileSync(new URL('../features/EmployeesPage.tsx', import.meta.url), 'utf8');
  assert.match(team, /Pozvat zaměstnance/);
  assert.doesNotMatch(team, /autoAssignEmployee|AI Přiřazení|odeslán SMS|Možný příjezd/i);
});

test('pilot lead detail contains only persisted customer, assignment, and history data', () => {
  const detail = readFileSync(new URL('../features/LeadDetail.tsx', import.meta.url), 'utf8');
  assert.match(detail, /Uložit přiřazení/);
  assert.match(detail, /Uložená historie/);
  assert.doesNotMatch(detail, /CommunicationTab|BudgetTab|InvoicesTab|AIChatMessage|setTimeout/i);
});

test('project overview never invents margin, staff, photos, or handover status', () => {
  const projects = readFileSync(new URL('../src/pages/owner/Projects.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(projects, /34\.2|100% podepsaných|Petr Novotný|\|\| 4|Math\.max\(15/i);
  assert.match(projects, /assignedEmployeeName/);
});

test('simulated AI copilot is excluded from the real company workspace', () => {
  const layout = readFileSync(new URL('../src/layouts/OwnerLayout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /isDemoWorkspace && <FloatingAIAssistant/);
  assert.doesNotMatch(layout, /DemoGeneratorModal|OnboardingWizardModal/);
});

test('command palette exposes only routes inside the verified owner pilot', () => {
  const palette = readFileSync(new URL('../components/CommandPalette.tsx', import.meta.url), 'utf8');
  assert.match(palette, /Přehled firmy/);
  assert.match(palette, /Poptávky/);
  assert.match(palette, /Tým/);
  assert.doesNotMatch(palette, /Calendar|Weather|Revenue|Synology|Quick Quote|Contracts|Enterprise Integrations/i);
});

test('deprecated simulated product modules are removed from the application source', () => {
  const removed = [
    '../components/AuditCard.tsx',
    '../components/ConnectionStatusBanner.tsx',
    '../components/DemoGeneratorModal.tsx',
    '../components/integrations/GoogleSheetsModal.tsx',
    '../components/integrations/SQLConnectorModal.tsx',
    '../components/synology/SynologyConnectionWizard.tsx',
    '../features/CustomerPortalPage.tsx',
    '../features/DocumentsPage.tsx',
    '../features/InteractiveStoryDemo.tsx',
    '../features/MapView.tsx',
    '../features/QuotesPage.tsx',
  ];
  for (const path of removed) assert.equal(existsSync(new URL(path, import.meta.url)), false, path);
});

test('public form and embed page use the real tenant-safe intake without simulated capabilities', () => {
  const form = readFileSync(new URL('../features/WidgetIframePage.tsx', import.meta.url), 'utf8');
  const embed = readFileSync(new URL('../features/EmbedWidgetPage.tsx', import.meta.url), 'utf8');
  assert.match(form, /publicSupabase\.rpc\('app_submit_public_lead'/);
  assert.match(form, /Souhlasím/);
  assert.doesNotMatch(form, /setTimeout|aiAnalysisResult|isRecordingVoice|photo1\.jpg/i);
  assert.match(embed, /<iframe src=/);
  assert.doesNotMatch(embed, /CDN Aktivní|0\.8 s|14\.2 kB|Okamžitý zápis/i);
});

test('local signup preserves its tenant identity across a page reload', () => {
  const context = readFileSync(new URL('../context/OrganizationContext.tsx', import.meta.url), 'utf8');
  const signupStart = context.indexOf('const signUp = async');
  const signupEnd = context.indexOf('// Auth Action: Log Out');
  const signup = context.slice(signupStart, signupEnd);
  assert.match(signup, /setActiveOrgId\(newOrgId\)/);
  assert.match(signup, /setActiveSessionUser\(/);
});
