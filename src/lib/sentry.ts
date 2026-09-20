import * as Sentry from '@sentry/react';

export function initSentry() {
  const meta = import.meta as any;
  const dsn = meta.env?.VITE_SENTRY_DSN;

  if (!dsn) {
    console.log('Sentry DSN nenalezeno, Sentry inicializace přeskočena.');
    return;
  }

  Sentry.init({
    dsn,
    environment: meta.env?.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: meta.env?.PROD ? 0.2 : 1.0,
  });
  
  console.log('Sentry úspěšně inicializováno.');
}
