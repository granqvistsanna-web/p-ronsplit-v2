import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qswvgfslsginwpqkbbki.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qNBQuKmlL4PNtwTnyn6wDQ__JdeVZGN";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
