/**
 * Application Environment Configuration & Validation
 * Safely parses and exposes browser-safe environment variables.
 * Never exposes service-role keys or sensitive server credentials to the client.
 */

export type MapsProviderMode = 'auto' | 'google' | 'demo' | 'mock';
export type AiProviderMode = 'auto' | 'gemini' | 'deterministic' | 'disabled';

export interface AiFeatureFlags {
  assistantEnabled: boolean;
  operatorCopilotEnabled: boolean;
  planningEnabled: boolean;
  explanationsEnabled: boolean;
  mutationAssistanceEnabled: boolean;
}

export interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  appName: string;
  appUrl: string;
  enableMockData: boolean;
  isDev: boolean;
  isProd: boolean;
  googleMapsBrowserKey: string;
  isGoogleMapsConfigured: boolean;
  mapsProviderMode: MapsProviderMode;
  defaultTransferBufferMinutes: number;
  aiProviderMode: AiProviderMode;
  aiEdgeFunctionUrl: string;
  aiFeatures: AiFeatureFlags;
}

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  if (metaEnv && typeof metaEnv[key] === 'string') {
    return metaEnv[key] || defaultValue;
  }
  return defaultValue;
};

const getBooleanFlag = (key: string, defaultVal: boolean): boolean => {
  const raw = getEnvVar(key, defaultVal ? 'true' : 'false').trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
  return defaultVal;
};

const isProd = Boolean(
  (import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD
);
const isDev = Boolean(
  (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? !isProd
);

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');

const googleMapsBrowserKey = getEnvVar('VITE_GOOGLE_MAPS_BROWSER_KEY').trim();
const rawProviderMode = getEnvVar('VITE_MAPS_PROVIDER_MODE', 'auto')
  .trim()
  .toLowerCase();

const mapsProviderMode: MapsProviderMode =
  rawProviderMode === 'google' ||
  rawProviderMode === 'demo' ||
  rawProviderMode === 'mock'
    ? rawProviderMode
    : 'auto';

const rawAiMode = getEnvVar('VITE_AI_PROVIDER_MODE', 'auto')
  .trim()
  .toLowerCase();

const aiProviderMode: AiProviderMode =
  rawAiMode === 'gemini' ||
  rawAiMode === 'deterministic' ||
  rawAiMode === 'disabled'
    ? rawAiMode
    : 'auto';

const parsedBuffer = Number.parseInt(
  getEnvVar('VITE_DEFAULT_TRANSFER_BUFFER_MINUTES', '15'),
  10
);
const defaultTransferBufferMinutes =
  Number.isFinite(parsedBuffer) && parsedBuffer >= 0 ? parsedBuffer : 15;

const explicitAiEdgeUrl = getEnvVar('VITE_AI_EDGE_FUNCTION_URL').trim();
const defaultAiEdgeUrl =
  supabaseUrl && !supabaseUrl.includes('your-supabase-project')
    ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ai-intelligence`
    : '';

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
  enableMockData: isProd
    ? getEnvVar('VITE_ENABLE_MOCK_DATA', 'false') === 'true'
    : getEnvVar('VITE_ENABLE_MOCK_DATA', 'true') === 'true',
  isDev,
  isProd,
  googleMapsBrowserKey,
  isGoogleMapsConfigured: Boolean(
    googleMapsBrowserKey &&
      googleMapsBrowserKey.length > 10 &&
      !googleMapsBrowserKey.includes('your-google-maps')
  ),
  mapsProviderMode,
  defaultTransferBufferMinutes,
  aiProviderMode,
  aiEdgeFunctionUrl: explicitAiEdgeUrl || defaultAiEdgeUrl,
  aiFeatures: {
    assistantEnabled: getBooleanFlag('VITE_AI_ASSISTANT_ENABLED', true),
    operatorCopilotEnabled: getBooleanFlag('VITE_AI_OPERATOR_COPILOT_ENABLED', true),
    planningEnabled: getBooleanFlag('VITE_AI_PLANNING_ENABLED', true),
    explanationsEnabled: getBooleanFlag('VITE_AI_EXPLANATIONS_ENABLED', true),
    mutationAssistanceEnabled: getBooleanFlag('VITE_AI_MUTATION_ASSISTANCE_ENABLED', true),
  },
};

