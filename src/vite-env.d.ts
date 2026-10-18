/// <reference types="vite/client" />

// Public build settings, listed in .env.example. Never add a secret here.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_ENV?: string;
}
