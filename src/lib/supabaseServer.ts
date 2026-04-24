import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Server-side client uses service role key to bypass RLS when needed.
// Falls back to anon key if service role key is not configured.
export function createServerSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
