"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const SINGLETON_ID = "00000000-0000-0000-0000-000000000001";

interface ConfigPayload {
  background_url?: string | null;
  background_type?: string;
  opacity?: number;
  titulo?: string;
  subtitulo?: string | null;
  cor_texto?: string;
}

export async function salvarConfigCardapio(
  config: ConfigPayload
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("cardapio_config")
    .update({ ...config, updated_at: new Date().toISOString() })
    .eq("id", SINGLETON_ID);

  if (error) return { error: error.message };
  revalidatePath("/produtos");
  return {};
}
