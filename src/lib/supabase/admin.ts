import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Admin client uses service role key to bypass RLS
// This should ONLY be used in server actions, never exposed to the browser
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set - admin operations will fail");
    // Fall back to anon key (will likely fail due to RLS)
    return createClient<Database>(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
