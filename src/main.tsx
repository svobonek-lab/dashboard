import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { PublicDemoWorkspace } from '@/features/publicDemo/PublicDemoWorkspace';

const isPublicDemo = window.location.pathname === '/demo' || window.location.pathname === '/interaktivni-demo';

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

