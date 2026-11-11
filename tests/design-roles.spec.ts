import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from 'playwright/test';

const authOrigin = 'https://design-preview.invalid';
const employeeId = '00333333-3333-4333-8333-333333333333';
const adminId = '00444444-4444-4444-8444-444444444444';
const companyId = '00222222-2222-4222-8222-222222222222';
const reviewCompany = {
  id: 'synthetic-company', name: 'Ukázková střešní firma', slug: 'synteticka-firma', active: true,
  onboarding_completed: false, created_at: '2026-11-06T00:00:00.000Z', member_count: 2, plan: 'pilot',
  subscription_status: 'active', integration_status: 'not_verified', invitation_status: 'sent', first_lead_at: null,
};

async function mockRoleSignIn(page: Page, role: 'employee' | 'platform_admin') {
  const id = role === 'employee' ? employeeId : adminId;
  const email = role === 'employee' ? 'pracovnik@example.test' : 'spravce@example.test';
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const claims = Buffer.from(JSON.stringify({ sub: id, exp: expiry, role: 'authenticated' })).toString('base64url');
  const member = { user_id: employeeId, company_id: companyId, name: 'Eva Horáková', email: 'pracovnik@example.test', role: 'employee', active: true };
  const company = { id: companyId, name: 'Ukázková stavební firma', slug: 'ukazkova-firma', active: true, plan: 'starter', subscription_status: 'active' };
  const lead = {
    id: 'synthetic-employee-job', company_id: companyId, title: 'Oprava střechy v ulici Na Výsluní',
    customer: 'Testovací zákazník', email: 'zakaznik@example.test', phone: '+420 700 000 001',
    address: 'Na Výsluní 42, Brno', description: 'Syntetická zakázka pro vizuální revizi.',
    status: 'in_progress', priority: 'normal', assigned_to: employeeId,
    scheduled_at: new Date().toISOString(), duration_minutes: 180, value: 125000,
    source: 'manual', created_at: '2026-11-06T10:00:00Z', updated_at: '2026-11-06T10:00:00Z', revision: 1,
  };
  await page.route(`${authOrigin}/**`, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/auth/v1/token' && method === 'POST' && url.searchParams.get('grant_type') === 'password') {
      await route.fulfill({ json: {
        access_token: `eyJhbGciOiJIUzI1NiJ9.${claims}.c3ludGhldGlj`, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 3600,
        user: { id, email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} },
      } });
    } else if (url.pathname === '/rest/v1/rpc/app_get_my_platform_role' && method === 'POST') {
      await route.fulfill({ json: role === 'platform_admin' ? { role: 'platform_admin', active: true } : null });
    } else if (method !== 'GET') {
      await route.abort();
    } else if (role === 'employee' && url.pathname === '/rest/v1/app_members') {
      await route.fulfill({ json: [member] });
    } else if (role === 'employee' && url.pathname === '/rest/v1/app_companies') {
      await route.fulfill({ json: [company] });
    } else if (role === 'employee' && url.pathname === '/rest/v1/app_leads') {
      await route.fulfill({ json: [lead] });
    } else if (role === 'employee' && url.pathname === '/rest/v1/app_invites') {
      await route.fulfill({ json: [] });
    } else {
      await route.abort();
    }
  });
  await page.goto('/login');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill('local-synthetic-password');
  await page.getByRole('button', { name: 'Přihlásit se', exact: true }).click();
  await expect(page).toHaveURL(role === 'employee' ? /\/employee$/ : /\/admin$/);
}

async function checkRoleScreen(page: Page, width: number) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(size.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(size.viewport);
  const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
}

test('employee signs in and sees assigned jobs and photos at phone and desktop widths', async ({ page }, testInfo) => {
  await mockRoleSignIn(page, 'employee');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/employee/jobs');
    await expect(page.getByRole('heading', { name: 'Moje zakázky & montáže' })).toBeVisible();
    await expect(page.getByText('Oprava střechy v ulici Na Výsluní')).toBeVisible();
    await checkRoleScreen(page, width);
    await page.screenshot({ path: testInfo.outputPath(`employee-jobs-${width}.png`), fullPage: true, animations: 'disabled' });

    await page.goto('/employee/photos');
    await expect(page.getByRole('heading', { name: 'Fotky ze stavby' })).toBeVisible();
    await checkRoleScreen(page, width);
    await page.screenshot({ path: testInfo.outputPath(`employee-photos-${width}.png`), fullPage: true, animations: 'disabled' });
  }
});

test('platform admin signs in and sees the company directory at phone and desktop widths', async ({ page }, testInfo) => {
  const writes: string[] = [];
  await page.route('**/api/platform/**', async (route) => {
    if (route.request().method() !== 'GET') {
      writes.push(route.request().method());
      await route.abort();
      return;
    }
    await route.fulfill({ json: { companies: [reviewCompany] } });
  });
  await mockRoleSignIn(page, 'platform_admin');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/companies');
    await expect(page.getByRole('heading', { name: 'Zákaznické firmy' })).toBeVisible();
    const directory = page.locator(width === 390 ? '[data-testid="admin-company-cards"]' : '[data-testid="admin-company-table"]');
    await expect(directory.getByText(reviewCompany.name)).toBeVisible();
    await checkRoleScreen(page, width);
    await page.screenshot({ path: testInfo.outputPath(`admin-company-directory-${width}.png`), fullPage: true, animations: 'disabled' });
  }
  expect(writes).toEqual([]);
});
