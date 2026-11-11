import { expect, test } from 'playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/demo', '/demo/leads', '/login'];
const widths = [1440, 1024, 768, 390, 320];

async function expectSingleTypeface(page: import('playwright/test').Page) {
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    const families = new Set<string>();
    const offenders: string[] = [];
    for (const element of document.querySelectorAll('body *')) {
      if (![...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) continue;
      const style = getComputedStyle(element);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        families.add(style.fontFamily);
        if (!style.fontFamily.startsWith('"IBM Plex Sans"')) offenders.push(element.outerHTML.slice(0, 180));
      }
    }
    const fontResources = performance.getEntriesByType('resource').map((entry) => entry.name).filter((url) => url.includes('.woff2'));
    return { families: [...families], offenders: offenders.slice(0, 5), fontResources, origin: location.origin, loaded: [...document.fonts].some((font) => font.family === 'IBM Plex Sans' && font.status === 'loaded') };
  });
  expect(fonts.families, `visible text should use one self-hosted typeface: ${JSON.stringify(fonts.offenders)}`).toEqual(['"IBM Plex Sans", sans-serif']);
  expect(fonts.loaded, 'IBM Plex Sans should load from the local font files').toBe(true);
  expect(fonts.fontResources.length).toBeGreaterThan(0);
  expect(fonts.fontResources.every((url) => url.startsWith(`${fonts.origin}/fonts/`)), 'font requests should stay on the application origin').toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route((url) => /^https?:/.test(url.href) && url.origin !== 'http://127.0.0.1:4177', (route) => route.abort());
});

test('public landing shows a plain legal identity notice without variable names', async ({ page }) => {
  await page.goto('/landing');
  await expect(page.getByTestId('legal-identity-notice')).toHaveText('Údaje o firmě se doplňují.');
  await expect(page.locator('body')).not.toContainText('VITE_');
});

test('public landing, demo, and login fit desktop, tablet, and phone widths', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  for (const route of ['/landing', ...routes]) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      if (route === '/landing') {
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      }
      const sizes = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      console.log(`${route} @ ${width}px: document ${sizes.document}px`);
      const offenders = sizes.document > sizes.viewport ? await page.evaluate(() => [...document.querySelectorAll('body *')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, className: typeof element.className === 'string' ? element.className : '', text: element.textContent?.trim().slice(0, 60), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
        })
        .filter((element) => element.left < -1 || element.right > innerWidth + 1)
        .slice(0, 12)) : [];
      expect(sizes.document, `${route} overflows at ${width}px: ${JSON.stringify(offenders)}`).toBeLessThanOrEqual(sizes.viewport);
      if ([1440, 390].includes(width) || route === '/demo/leads') {
        if (['/landing', '/demo'].includes(route)) await expectSingleTypeface(page);
        await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-')}-${width}.png`), fullPage: true });
        if (['/landing', '/demo', '/login'].includes(route) && [390, 1440].includes(width)) {
          await page.evaluate(() => document.fonts.ready);
          await expect(page).toHaveScreenshot(`${route.slice(1)}-${width}.png`, { fullPage: true });
        }
      }
      if (route === '/demo') {
        await expect(page.getByRole('heading', { name: /dobrý den/i })).toBeVisible();
        await expect(page.locator('.workspace-primary-action')).toHaveCount(0);
      }
    }
  }
});

test('public demo remains clearly synthetic, read only, and free of external name-based avatars', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4177') externalRequests.push(request.url());
  });
  await page.route('https://**/*', (route) => route.abort());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/demo/leads');
  await expect(page.getByText('Veřejné demo · pouze syntetická data · pouze pro čtení')).toBeVisible();
  await expect(page.getByText('Pouze pro čtení').first()).toBeVisible();
  await expect(page.locator('img[src*="dicebear"]')).toHaveCount(0);
  await expect(page.locator('[data-kanban-column]:visible')).toHaveCount(6);
  expect(externalRequests.filter((url) => /dicebear/i.test(url)), 'employee avatars must be generated locally').toEqual([]);
});

test('mobile kanban switches stages without clipping the active column', async ({ page }, testInfo) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/demo/leads');
    const tabs = page.getByRole('tablist', { name: 'Stav zakázek' });
    await expect(tabs).toBeVisible();
    const fade = page.locator('.kanban-mobile-tabs');
    await expect(fade).toHaveAttribute('data-scroll-right', 'true');
    await expect.poll(() => fade.evaluate((element) => getComputedStyle(element, '::after').opacity)).toBe('1');
    expect(await fade.evaluate((element) => getComputedStyle(element, '::after').backgroundImage)).toContain('linear-gradient');
    const tabHeights = await tabs.getByRole('tab').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
    expect(Math.min(...tabHeights)).toBeGreaterThanOrEqual(44);
    const tabScroll = await tabs.evaluate((element) => ({ width: element.clientWidth, content: element.scrollWidth }));
    expect(tabScroll.content).toBeGreaterThan(tabScroll.width);
    await tabs.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    await expect(fade).toHaveAttribute('data-scroll-left', 'true');
    await expect(fade).toHaveAttribute('data-scroll-right', 'false');
    if (width === 390) await page.screenshot({ path: testInfo.outputPath('demo-tabs-390-scrolled.png'), animations: 'disabled' });
    await tabs.evaluate((element) => { element.scrollLeft = 0; });
    await expect(fade).toHaveAttribute('data-scroll-right', 'true');
    const firstTab = tabs.getByRole('tab', { name: /Nová poptávka/ });
    await firstTab.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.getByRole('tab', { name: /Stornováno/ })).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.getByRole('tab', { name: /Stornováno/ })).toBeFocused();
    const stages = ['Nová poptávka', 'Kontaktováno', 'Rozpočet / Nabídka', 'Realizace stavby', 'Dokončeno & Předáno', 'Stornováno'];
    for (const stage of stages) {
      const tab = tabs.getByRole('tab', { name: new RegExp(stage) });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      const column = page.locator('[data-kanban-column]:visible');
      await expect(column.getByRole('heading', { name: stage })).toBeVisible();
      const bounds = await column.boundingBox();
      expect(bounds?.x).toBeGreaterThanOrEqual(0);
      expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(width);
    }
  }
});

test('long synthetic lead titles and prices remain available and mobile tabs name their panels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/fixtures/lead-board-long-values.html');
  const tab = page.getByRole('tab', { name: /Nová poptávka/ });
  await expect(tab).toHaveAttribute('aria-controls', 'kanban-col-New');
  const panel = page.getByRole('tabpanel', { name: 'Nová poptávka' });
  await expect(panel).toHaveAttribute('id', 'kanban-col-New');
  const title = 'Oprava a kompletní rekonstrukce střechy rodinného domu včetně zateplení, okapů a nového krovu';
  await expect(panel.getByRole('heading', { name: title })).toBeVisible();
  const price = panel.locator('[class*="tabular-nums"]').filter({ hasText: 'Kč' });
  await expect(price).toBeVisible();
  const priceText = (await price.textContent()) || '';
  expect(priceText.replace(/\D/g, '')).toBe('987654321');
  expect(priceText).toMatch(/987[\s\u00a0\u202f]654[\s\u00a0\u202f]321 Kč/);
  const titleStyle = await panel.getByRole('heading', { name: title }).evaluate((element) => getComputedStyle(element).webkitLineClamp);
  expect(titleStyle).not.toBe('2');
});

test('keyboard focus is visible on the public demo navigation', async ({ page }) => {
  await page.goto('/demo/leads');
  await expect(page.getByRole('link', { name: 'StavbaFlow demo' })).toBeVisible();
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return null;
    const style = getComputedStyle(element);
    return { tag: element.tagName, label: element.getAttribute('aria-label'), text: element.textContent?.trim(), visible: element.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focus?.visible, JSON.stringify(focus)).toBe(true);
  expect(focus?.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(focus?.outlineWidth || '0')).toBeGreaterThanOrEqual(2);
});

test('keyboard Tab shows a focus ring on every reachable button and link', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  for (const route of ['/landing', '/login', '/demo/leads']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    if (route === '/landing') await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    if (route === '/login') await expect(page.getByRole('heading', { name: /přihlášení/i })).toBeVisible();
    if (route === '/demo/leads') await expect(page.getByRole('tablist', { name: 'Stav zakázek' })).toBeVisible();
    const eligible = await page.evaluate(() => {
      let count = 0;
      for (const element of document.querySelectorAll<HTMLElement>('button, a[href]')) {
        if (element.tabIndex < 0 || element.hasAttribute('disabled') || !element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') continue;
        element.dataset.focusAuditId = String(count++);
      }
      return count;
    });
    const visited = new Set<string>();
    expect(eligible, `${route}: rendered button/link count`).toBeGreaterThan(0);
    let captured = false;
    for (let step = 0; step < eligible + 20 && visited.size < eligible; step++) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement;
        if (!element?.dataset.focusAuditId) return null;
        const style = getComputedStyle(element);
        return { id: element.dataset.focusAuditId, visible: element.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), outlineColor: style.outlineColor };
      });
      if (!focus) continue;
      expect(focus.visible, `${route}: ${JSON.stringify(focus)}`).toBe(true);
      expect(focus.outlineStyle, `${route}: ${JSON.stringify(focus)}`).not.toBe('none');
      expect(focus.outlineWidth, `${route}: ${JSON.stringify(focus)}`).toBeGreaterThanOrEqual(2);
      expect(focus.outlineColor, `${route}: ${JSON.stringify(focus)}`).not.toBe('rgba(0, 0, 0, 0)');
      visited.add(focus.id);
      if (!captured) {
        await page.screenshot({ path: testInfo.outputPath(`focus-${route.replaceAll('/', '-')}-390.png`), animations: 'disabled' });
        captured = true;
      }
    }
    expect(visited.size, `${route}: reachable button/link focus stops`).toBe(eligible);
    expect(captured, `${route}: focus screenshot was captured`).toBe(true);
    console.log(`${route}: ${visited.size} button/link Tab stops with visible focus rings`);
  }
});

test('reduced motion removes decorative transition time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demo/leads');
  const duration = await page.getByRole('button', { name: 'Poptávky' }).evaluate((element) => {
    const values = getComputedStyle(element).transitionDuration.split(',').map((value) => Number.parseFloat(value) || 0);
    return Math.max(...values);
  });
  expect(duration).toBeLessThanOrEqual(0.01);
});

test('sign in and recovery screens load without submitting a request', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /přihlášení/i })).toBeVisible();
  await page.getByRole('button', { name: /zapomenuté heslo/i }).click();
  await expect(page.getByRole('heading', { name: 'Obnovit heslo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Odeslat bezpečný odkaz' })).toBeVisible();
});

test('landing presents the product and keeps contact and pricing accessible', async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Na stavbě máte dost práce/ })).toBeVisible();
    await expect(page.getByLabel('Ukázka aplikace se syntetickými zakázkami')).toBeVisible();
    const contact = page.getByRole('button', { name: 'Prohlédnout s námi' });
    expect((await contact.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await contact.click();
    await expect(page.getByRole('heading', { name: 'Ukázat StavbaFlow na mém procesu' })).toBeVisible();
    await page.getByRole('button', { name: 'Zavřít konzultaci' }).click();
    await page.goto('/');
    for (const name of ['Pokračovat s tarifem Start', 'Pokračovat s tarifem Růst']) {
      await expect(page.getByRole('link', { name })).toBeVisible();
    }
    const sizes = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    expect(sizes[0]).toBeLessThanOrEqual(sizes[1]);
  }
});

test('owner overview keeps statuses visible on mobile and can filter work awaiting action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  const rows = page.locator('.workspace-list-row');
  await expect(rows.first().locator('.workspace-row-status')).toBeVisible();
  const filter = page.getByRole('button', { name: /^K vyřízení/ });
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  for (const status of await rows.locator('.workspace-row-status').allTextContents()) {
    expect(['Nová poptávka', 'Nabídka']).toContain(status);
  }
  await expect(rows.first()).toBeVisible();
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'false');
});

test('synthetic owner signs in through the form and reaches the protected dashboard', async ({ page }, testInfo) => {
  const userId = '00111111-1111-4111-8111-111111111111';
  const companyId = '00222222-2222-4222-8222-222222222222';
  const email = 'majitel@example.test';
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const claims = Buffer.from(JSON.stringify({ sub: userId, exp: expires, role: 'authenticated' })).toString('base64url');
  const member = { user_id: userId, company_id: companyId, name: 'Patrik Novák', email, role: 'owner', active: true };
  await page.route('https://design-preview.invalid/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/auth/v1/token' && method === 'POST' && url.searchParams.get('grant_type') === 'password') {
      await route.fulfill({ json: { access_token: `eyJhbGciOiJIUzI1NiJ9.${claims}.c3ludGhldGlj`, refresh_token: 'synthetic', token_type: 'bearer', expires_in: 3600, user: { id: userId, email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} } } });
    } else if (url.pathname === '/rest/v1/rpc/app_get_my_platform_role' && method === 'POST') {
      await route.fulfill({ json: null });
    } else if (method !== 'GET') {
      await route.abort();
    } else if (url.pathname === '/rest/v1/app_members') {
      await route.fulfill({ json: [member] });
    } else if (url.pathname === '/rest/v1/app_companies') {
      await route.fulfill({ json: [{ id: companyId, name: 'Ukázková stavební firma', slug: 'ukazkova-firma', active: true, plan: 'starter', subscription_status: 'active' }] });
    } else if (url.pathname === '/rest/v1/app_leads') {
      await route.fulfill({ json: [{ id: 'synthetic-roof', company_id: companyId, title: 'Výměna krytiny v Brně', customer: 'Zkušební zákazník', status: 'new', priority: 'normal', value: 125000, created_at: '2026-11-06T10:00:00Z' }] });
    } else if (url.pathname === '/rest/v1/app_invites') {
      await route.fulfill({ json: [] });
    } else {
      await route.abort();
    }
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/login');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill('local-synthetic-password');
  await page.getByRole('button', { name: 'Přihlásit se', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dobrý den, Patrik' })).toBeVisible();
  const railName = page.locator('#owner-navigation h1');
  await expect(railName).toHaveText('Ukázková stavební firma');
  const railDetails = await railName.evaluate((name) => {
    const rail = name.closest('aside');
    const luminance = (value: number) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    };
    const rgb = (color: string) => (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luma = (color: string) => rgb(color).reduce((sum, value, index) => sum + luminance(value) * [0.2126, 0.7152, 0.0722][index], 0);
    const foreground = luma(getComputedStyle(name).color);
    const background = luma(getComputedStyle(rail!).backgroundColor);
    return {
      contrast: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05),
      textHeight: name.scrollHeight,
      lineHeight: parseFloat(getComputedStyle(name).lineHeight),
      clipped: name.scrollWidth > name.clientWidth,
    };
  });
  expect(railDetails.contrast).toBeGreaterThanOrEqual(4.5);
  console.log(`Owner rail company name contrast: ${railDetails.contrast.toFixed(2)}:1`);
  expect(railDetails.textHeight / railDetails.lineHeight).toBeGreaterThan(1.5);
  expect(railDetails.textHeight / railDetails.lineHeight).toBeLessThanOrEqual(2.1);
  expect(railDetails.clipped).toBe(false);
  await expect(page.locator('.workspace-primary-action')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Otevřít poptávky' })).toHaveCount(1);
  await expect(page.locator('.sf-work-focus')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^K vyřízení/ })).toHaveCount(1);
  const nextStep = page.getByText(/^Další krok:/);
  await expect(nextStep).toBeVisible();
  const nextStepTop = await nextStep.evaluate((element) => element.getBoundingClientRect().top);
  const dashboardTop = await page.getByRole('heading', { name: 'Dobrý den, Patrik' }).evaluate((element) => element.getBoundingClientRect().top);
  expect(nextStepTop).toBeLessThan(dashboardTop);
  const desktopContrast = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(desktopContrast.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
  const lead = page.locator('.workspace-list-row').filter({ hasText: 'Výměna krytiny v Brně' });
  await expect(lead.getByText('Nová poptávka')).toBeVisible();
  await expectSingleTypeface(page);
  await page.screenshot({ path: testInfo.outputPath('dashboard-signed-in-1440.png') });
  await expect(page).toHaveScreenshot('owner-dashboard-1440.png', { fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Otevřít menu navigace' })).toBeVisible();
  await expect.poll(() => page.locator('aside.workspace-rail').evaluate((sidebar) => sidebar.getBoundingClientRect().right)).toBeLessThanOrEqual(1);
  const menuButton = page.getByRole('button', { name: 'Otevřít menu navigace' });
  const navigation = page.locator('#owner-navigation');
  await expect(navigation).toBeHidden();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.click();
  await expect(navigation).toBeVisible();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  const mobileName = await railName.evaluate((name) => ({
    clipped: name.scrollWidth > name.clientWidth,
    lines: name.scrollHeight / parseFloat(getComputedStyle(name).lineHeight),
  }));
  expect(mobileName.clipped).toBe(false);
  expect(mobileName.lines).toBeGreaterThan(1.5);
  expect(mobileName.lines).toBeLessThanOrEqual(2.1);
  const mobileContrast = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(mobileContrast.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('dashboard-signed-in-390-menu-open.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(navigation).toBeHidden();
  await expect(menuButton).toBeFocused();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(lead.getByText('Nová poptávka')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expectSingleTypeface(page);
  await page.screenshot({ path: testInfo.outputPath('dashboard-signed-in-390.png'), animations: 'disabled', fullPage: true });
  await expect(page).toHaveScreenshot('owner-dashboard-390.png', { fullPage: true });
});

test('calculator sliders have accessible names and keyboard controls', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Počet měsíčních poptávek', 'Podíl poptávek s nabídkou', 'Podíl získaných nabídek', 'Průměrná marže zakázky v Kč', 'Hodiny administrativy týdně']) {
    const slider = page.getByRole('slider', { name, exact: true });
    await expect(slider).toBeVisible();
    const before = Number(await slider.inputValue());
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    expect(Number(await slider.inputValue())).toBeGreaterThan(before);
  }
});

test('recovery failure gives a safe next step without exposing provider text', async ({ page }) => {
  await page.route('**/api/reset-employee-password', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'AUTH_RECOVERY_DISABLED', error: 'private provider diagnostic' }),
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByRole('button', { name: /zapomenuté heslo/i }).click();
  await page.getByLabel('E-mail').fill('synthetic@example.test');
  await page.getByRole('button', { name: 'Odeslat bezpečný odkaz' }).click();
  await expect(page.getByRole('alert')).toContainText('Požádejte správce StavbaFlow o pomoc.');
  await expect(page.getByText('private provider diagnostic')).toHaveCount(0);
});

test('recovery success is shown only after the mocked API confirms a request', async ({ page }) => {
  let requestBody: unknown;
  await page.route('**/api/reset-employee-password', async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requested: true, message: 'Pokud účet existuje, přijde na něj bezpečný odkaz.' }) });
  });
  await page.goto('/login');
  await page.getByRole('button', { name: /zapomenuté heslo/i }).click();
  await page.getByLabel('E-mail').fill('Synthetic@Example.test');
  await page.getByRole('button', { name: 'Odeslat bezpečný odkaz' }).click();
  await expect(page.getByRole('status')).toContainText('Pokud účet existuje, přijde na něj bezpečný odkaz.');
  expect(requestBody).toEqual({ email: 'synthetic@example.test' });
});

test('synthetic employee dashboard fits mobile and exposes no write action without a handler', async ({ page }, testInfo) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tests/fixtures/employee-dashboard.html');
    await expect(page.getByRole('heading', { name: 'Moje zakázky' })).toBeVisible();
    await expect(page.getByText('Oprava střechy v ulici Na Výsluní')).toBeVisible();
    await expect(page.getByText('Aktuálně nemáte přiřazenou práci')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Zahájit realizaci|Dokončit zakázku|Potvrdit kontakt|Předat do nabídky/ })).toHaveCount(0);
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath('employee-dashboard-390.png'), fullPage: true });
  }
});

test('synthetic platform directory fits mobile and desktop without sending mutations', async ({ page }, testInfo) => {
  const writes: string[] = [];
  await page.route('**/api/platform/companies', async (route) => {
    if (route.request().method() !== 'GET') {
      writes.push(route.request().method());
      await route.fulfill({ status: 405, body: 'Read only design fixture' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ companies: [{
      id: 'synthetic-company', name: 'Ukázková střešní firma', slug: 'synteticka-firma', active: true,
      onboarding_completed: false, created_at: '2026-11-06T00:00:00.000Z', member_count: 2, plan: 'pilot',
      subscription_status: 'active', integration_status: 'not_verified', invitation_status: 'sent', first_lead_at: null,
    }] }) });
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tests/fixtures/admin-company-directory.html');
    await expect(page.getByRole('heading', { name: 'Zákaznické firmy' })).toBeVisible();
    const surface = page.locator(width < 768 ? '[data-testid="admin-company-cards"]' : '[data-testid="admin-company-table"]');
    await expect(surface).toBeVisible();
    await expect(surface.getByText('Ukázková střešní firma')).toBeVisible();
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath('admin-company-directory-390.png'), fullPage: true });
  }
  expect(writes).toEqual([]);
});

test('known public and gated routes have no uncaught page errors or viewport overflow', async ({ page }) => {
  test.setTimeout(180_000);
  const routes = ['/', '/landing', '/prezentace', '/demo', '/demo/leads', '/login', '/owner/login', '/employee/login', '/admin/login', '/register-paid', '/widget-iframe', '/widget-iframe.html', '/inquiry', '/inquiry/synthetic-company', '/poptavka', '/form', '/form/synthetic-company', '/portal', '/portal/synthetic-company', '/unauthorized', '/admin', '/admin/dashboard', '/admin/companies', '/employee', '/employee/dashboard', '/employee/jobs', '/employee/photos', '/billing/return', '/dashboard', '/leads', '/projects', '/employees', '/widget', '/integrations', '/settings', '/calendar', '/analytics', '/quotes', '/documents', '/communication', '/integrations/synology', '/support/synthetic-session'];
  const uncaught: string[] = [];
  const unexpectedExternalRequests: string[] = [];
  await page.route('https://design-preview.invalid/rest/v1/rpc/app_get_public_company', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  page.on('pageerror', (error) => uncaught.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4177' && url.pathname !== '/rest/v1/rpc/app_get_public_company') unexpectedExternalRequests.push(request.url());
  });
  for (const route of routes) {
    const widthsToCheck = ['/demo', '/demo/leads', '/login'].includes(route) ? [1440, 390] : [1440];
    for (const width of widthsToCheck) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#root'), `${route} @ ${width}px`).toBeAttached();
      if (route === '/' || route === '/landing' || route === '/prezentace') {
        await expect(page.getByRole('heading', { level: 1, name: /Na stavbě máte dost práce/i }), route).toBeVisible({ timeout: 12_000 });
      }
      if (route === '/demo' || route === '/demo/leads') await expect(page.getByText('Veřejné demo · pouze syntetická data · pouze pro čtení')).toBeVisible();
      if (route === '/login' || route.endsWith('/login')) await expect(page.getByRole('heading', { name: /Přihlášení/ })).toBeVisible();
      if (route === '/register-paid') await expect(page.getByRole('heading', { name: /Vaše firma/ })).toBeVisible();
      if (['/widget-iframe', '/widget-iframe.html', '/inquiry', '/inquiry/synthetic-company', '/poptavka', '/form', '/form/synthetic-company'].includes(route)) {
        await expect(page.getByRole('heading', { name: 'Formulář není dostupný' })).toBeVisible();
      }
      if (route === '/portal' || route === '/portal/synthetic-company') await expect(page.getByRole('heading', { name: 'Tato funkce zatím není aktivní' })).toBeVisible();
      if (route === '/unauthorized') await expect(page.getByRole('heading', { name: '403 - Přístup odepřen' })).toBeVisible();
      if (['/admin', '/admin/dashboard', '/admin/companies', '/employee', '/employee/dashboard', '/employee/jobs', '/employee/photos', '/dashboard', '/leads', '/projects', '/employees', '/widget', '/integrations', '/settings', '/calendar', '/analytics', '/quotes', '/documents', '/communication', '/integrations/synology', '/support/synthetic-session', '/billing/return'].includes(route)) {
        await expect(page.getByRole('heading', { name: /Přihlášení/ })).toBeVisible();
      }
      const sizes = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(sizes.document, `${route} overflows at ${width}px`).toBeLessThanOrEqual(sizes.viewport);
    }
  }
  expect(uncaught).toEqual([]);
  expect(unexpectedExternalRequests).toEqual([]);
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Tahle stránka neexistuje' })).toBeVisible();
});
