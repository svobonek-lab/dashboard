import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { OrganizationProvider } from '@/context/OrganizationContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initSentry } from './lib/sentry';

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <OrganizationProvider>
        <App />
      </OrganizationProvider>
    </ErrorBoundary>
  </StrictMode>,
);

