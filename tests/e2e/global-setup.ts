import '../../scripts/assert-staging-e2e-env.mjs';

export default async function globalSetup() {
  // The imported preflight fails before Playwright creates any authenticated page.
}
