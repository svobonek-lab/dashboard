import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { PublicDemoWorkspace } from '../pages/public/demo';
import { isPublicDemoPath } from '../shared/lib/demoUrl';

const isPublicDemo = isPublicDemoPath(window.location.pathname);

export async function startApplication() {
  const root = createRoot(document.getElementById('root')!);

  const [{ ErrorBoundary }, { initSentry }] = await Promise.all([
    import('./providers/ErrorBoundary'),
    import('../shared/lib/sentry'),
  ]);
  initSentry();

  if (isPublicDemo) {
    root.render(<StrictMode><ErrorBoundary><PublicDemoWorkspace /></ErrorBoundary></StrictMode>);
    return;
  }

  const [{ default: App }, { OrganizationProvider }] = await Promise.all([
    import('./App.tsx'),
    import('./providers/OrganizationProvider'),
  ]);
  root.render(<StrictMode><ErrorBoundary><OrganizationProvider><App /></OrganizationProvider></ErrorBoundary></StrictMode>);
}
