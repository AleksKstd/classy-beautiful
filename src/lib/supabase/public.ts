import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Anonymous (public) Supabase client. Row Level Security only lets it read
 * active procedures, schedule closures and active carousel images.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  }
  return createClient<Database>(url, anonKey, { auth: { persistSession: false } });
}
