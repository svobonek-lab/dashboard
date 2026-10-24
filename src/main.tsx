import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PublicDemoWorkspace } from './pages/public/demo';
import { isPublicDemoPath } from './app/demoUrl';

const isPublicDemo = isPublicDemoPath(window.location.pathname);

async function startApplication() {
  const root = createRoot(document.getElementById('root')!);

  if (isPublicDemo) {
    root.render(<StrictMode><PublicDemoWorkspace /></StrictMode>);
    return;
  }

  const [{ default: App }, { OrganizationProvider }, { ErrorBoundary }, { initSentry }] = await Promise.all([
    import('./App.tsx'),
    import('@/context/OrganizationContext'),
    import('../components/ErrorBoundary'),
    import('./lib/sentry'),
  ]);
  initSentry();
  root.render(<StrictMode><ErrorBoundary><OrganizationProvider><App /></OrganizationProvider></ErrorBoundary></StrictMode>);
}

void startApplication();

