import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['design-system.spec.ts', 'design-roles.spec.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  preserveOutput: 'always',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4177',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/playwright-design-server.mjs',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://design-preview.invalid',
      VITE_SUPABASE_ANON_KEY: 'local-design-test-key',
    },
  },
});
