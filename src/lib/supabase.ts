import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { criarFetchComPrazo } from "@/lib/supabaseFetch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: criarFetchComPrazo() },
});
