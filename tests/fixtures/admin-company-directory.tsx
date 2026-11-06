import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminCompaniesPage } from '../../src/pages/admin/companies/ui/Companies';
import { RouterProvider } from '../../src/shared/lib/router';
import '../../src/app/styles/index.css';

const base64Url = (value: string) => btoa(value).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const token = `e30.${base64Url(JSON.stringify({ sub: 'synthetic-platform-admin', role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }))}.synthetic-signature`;
localStorage.setItem('sb-design-preview-auth-token', JSON.stringify({
  access_token: token,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'synthetic-refresh-token',
  user: { id: 'synthetic-platform-admin', aud: 'authenticated', role: 'authenticated', email: 'admin@example.test', app_metadata: {}, user_metadata: {} },
}));

createRoot(document.getElementById('admin-test-root')!).render(
  <RouterProvider><AdminCompaniesPage /></RouterProvider>,
);
