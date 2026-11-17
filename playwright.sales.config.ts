import { defineConfig } from 'playwright/test';

const command = 'node scripts/playwright-sales-server.mjs';
const server = (port: number, surface: string, appUrl?: string, landingUrl = 'http://127.0.0.1:4177') => ({
  command,
  url: `http://127.0.0.1:${port}`,
  reuseExistingServer: false,
  timeout: 120_000,
  env: {
    SALES_TEST_PORT: String(port),
    SALES_TEST_SURFACE: surface,
    SALES_TEST_APP_URL: appUrl ?? '',
    SALES_TEST_LANDING_URL: landingUrl,
  },
});

export default defineConfig({
  testDir: './tests',
  testMatch: 'sales-navigation.spec.ts',
  workers: 1,
  reporter: 'list',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    server(4177, 'landing', 'http://127.0.0.1:4178'),
    server(4178, 'app', 'http://127.0.0.1:4178'),
    server(4179, 'landing'),
    server(4180, 'landing', 'http://invalid.example.test'),
    server(4181, 'landing', 'http://127.0.0.1:4181'),
    server(4182, 'app', 'http://127.0.0.1:4182', ''),
  ],
});
