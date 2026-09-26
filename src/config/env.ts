/**
 * Application Environment Configuration & Validation
 * Safely parses and exposes browser-safe environment variables.
 * Never exposes service-role keys or sensitive server credentials to the client.
 */

export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  appName: string;
  appUrl: string;
  enableMockData: boolean;
  isDev: boolean;
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const env: AppEnv = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-supabase-project')
  ),
  appName: getEnvVar('VITE_APP_NAME', 'Triplanner'),
  appUrl: getEnvVar('VITE_APP_URL', 'http://localhost:5173'),
  enableMockData: getEnvVar('VITE_ENABLE_MOCK_DATA', 'true') === 'true',
  isDev: import.meta.env.DEV,
};
