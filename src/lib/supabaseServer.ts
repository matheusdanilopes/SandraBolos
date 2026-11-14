import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { criarFetchComPrazo } from "@/lib/supabaseFetch";

// Cliente do servidor com a chave de serviço (ignora o RLS). Todas as leituras e
// escritas do app passam por aqui: as tabelas não têm policies para a chave
// pública (migration 018), então ninguém acessa os dados sem passar pelo login.
// Não há mais fallback para a chave anon: sem a chave de serviço o app não lê nada.
export function createServerSupabaseClient(fetchComPrazo: typeof fetch = criarFetchComPrazo()) {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchComPrazo },
  });
}
