import { defineConfig } from 'playwright/test';
import stagingConfig from './playwright.staging.config';

export default defineConfig({
  ...stagingConfig,
  testMatch: ['**/billing-blocked-to-granted.spec.ts'],
  testIgnore: [],
  fullyParallel: false,
  retries: 0,
  workers: 1,
});
