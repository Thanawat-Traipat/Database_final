import { createClient } from "@supabase/supabase-js";

// Read the public Supabase project URL from environment variables instead of hardcoding it.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Read the public anon key from environment variables so local and Vercel deployments can use different projects.
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This boolean lets the UI show a clear database setup error before any query runs.
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create the Supabase client only when both required environment variables exist.
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // The project uses its own demo staff login table, so Supabase Auth sessions are not persisted.
        persistSession: false,
        // Auto-refresh is disabled because this app does not use Supabase Auth tokens for role sessions.
        autoRefreshToken: false
      }
    })
  // Returning null makes missing configuration explicit instead of failing with an unclear client error later.
  : null;
