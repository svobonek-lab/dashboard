import React from 'react';
import { createRoot } from 'react-dom/client';
import { AdminCompaniesPage } from '../../src/pages/admin/companies';
import { RouterProvider } from '../../src/shared/lib/router';
import '../../src/app/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <RouterProvider>
    <div className="min-h-screen bg-[#090D16] p-4 text-slate-100">
      <AdminCompaniesPage />
    </div>
  </RouterProvider>,
);
