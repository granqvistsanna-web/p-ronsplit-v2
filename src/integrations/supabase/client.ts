import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * IMPORTANT:
 * Do not throw at module load time.
 * Missing env vars would otherwise crash the entire app (white screen).
 */
const FALLBACK_URL = "https://example.supabase.co";
const FALLBACK_ANON_KEY = "public-anon-key";

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL ?? FALLBACK_URL,
  SUPABASE_ANON_KEY ?? FALLBACK_ANON_KEY
);

