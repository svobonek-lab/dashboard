/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAID_REGISTRATION_ENABLED?: string;
  readonly VITE_DEMO_URL?: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
