/**
 * Supabase Client Initialization & Fallback Handler
 * Establishes a clean data access layer for authentication, realtime, database, and storage.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export let supabase: SupabaseClient | null = null;

if (env.isSupabaseConfigured) {
  try {
    supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.warn('[Triplanner] Failed to initialize Supabase client:', error);
    supabase = null;
  }
} else {
  console.info(
    '[Triplanner] Supabase credentials not set or using placeholder. Running in fallback/mock mode.'
  );
}

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    );
  }
  return supabase;
};
