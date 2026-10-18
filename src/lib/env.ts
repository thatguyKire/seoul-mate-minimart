// Build-time settings. Every VITE_ value is public: it ships in the browser bundle.

export type AppEnv = 'local' | 'staging' | 'production';

function appEnv(value: string | undefined): AppEnv {
  return value === 'staging' || value === 'production' ? value : 'local';
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  appEnv: appEnv(import.meta.env.VITE_APP_ENV),
};

/** Sample products are labeled everywhere except production (D-010). */
export const showSampleLabels = env.appEnv !== 'production';
