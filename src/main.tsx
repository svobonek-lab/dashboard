import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

Sentry.init({
  dsn: (import.meta as any).env?.VITE_SENTRY_DSN,
  environment: (import.meta as any).env?.MODE,
  tracesSampleRate: 0.1,
  enabled: !!(import.meta as any).env?.VITE_SENTRY_DSN,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <OrganizationProvider>
        <App />
      </OrganizationProvider>
    </ErrorBoundary>
  </StrictMode>,
);

