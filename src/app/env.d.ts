/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAID_REGISTRATION_ENABLED?: string;
  readonly PUBLIC_APP_URL?: string;
  readonly PUBLIC_LANDING_URL?: string;
  readonly VITE_LEAD_NOTES_FILES_ENABLED?: string;
  readonly VITE_STAGING_SUPABASE_PROJECT_REF?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
