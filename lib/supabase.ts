import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function getEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function createServerSupabaseClient(accessToken?: string): SupabaseClient {
  const env = getEnv();

  if (!env) {
    throw new Error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local.');
  }

  return createClient(env.url, env.anonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const env = getEnv();
  if (!env) return null;

  browserClient = createClient(env.url, env.anonKey);
  return browserClient;
}

export function hasSupabaseEnv(): boolean {
  return Boolean(getEnv());
}
