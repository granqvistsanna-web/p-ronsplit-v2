import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables and provide helpful error message
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '❌ Missing Supabase environment variables!\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY\n' +
    'See .env.example for setup instructions.'
  );

  // Throw error to be caught by ErrorBoundary
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
    'Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
