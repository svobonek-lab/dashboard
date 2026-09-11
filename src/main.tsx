import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { OrganizationProvider } from '@/context/OrganizationContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OrganizationProvider>
      <App />
    </OrganizationProvider>
  </StrictMode>,
);

