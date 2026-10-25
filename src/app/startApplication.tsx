import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { PublicDemoWorkspace } from '../pages/public/demo';
import { isPublicDemoPath } from '../shared/lib/demoUrl';

const isPublicDemo = isPublicDemoPath(window.location.pathname);

export async function startApplication() {
  const root = createRoot(document.getElementById('root')!);

  if (isPublicDemo) {
    root.render(<StrictMode><PublicDemoWorkspace /></StrictMode>);
    return;
  }

  const [{ default: App }, { OrganizationProvider }, { ErrorBoundary }, { initSentry }] = await Promise.all([
    import('./App.tsx'),
    import('./providers/OrganizationProvider'),
    import('./providers/ErrorBoundary'),
    import('../shared/lib/sentry'),
  ]);
  initSentry();
  root.render(<StrictMode><ErrorBoundary><OrganizationProvider><App /></OrganizationProvider></ErrorBoundary></StrictMode>);
}
