import { createClient } from "@supabase/supabase-js";

// Use environment variables if available, otherwise fall back to hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://xgmsleodlfdiguayubep.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_NfoYXxxJm7FmEFnGY4P-og_7N4WCnla";

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.error("Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

