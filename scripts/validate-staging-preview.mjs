export function validateStagingPreview(previewValue, productionValue) {
  let preview;
  let production;
  try {
    preview = new URL(String(previewValue));
    production = new URL(String(productionValue));
  } catch {
    throw new Error('Refusing to use an invalid staging Preview URL.');
  }

  const trustedHost = /^dashboard-[a-z0-9-]+-svobonek-6462s-projects\.vercel\.app$/i.test(preview.hostname);
  const noCredentials = !preview.username && !preview.password;
  if (preview.protocol !== 'https:' || !trustedHost || !noCredentials || preview.port) {
    throw new Error('Refusing to send staging credentials outside a trusted Vercel Preview URL.');
  }
  if (production.protocol !== 'https:' || preview.origin === production.origin) {
    throw new Error('Refusing to use a Preview URL that is not distinct from production.');
  }
  return preview.origin;
}
