"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function salvarConfiguracaoAction(
  limiteExtraKg: number
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("configuracoes")
    .upsert({ id: 1, limite_peso_extra_kg: limiteExtraKg, updated_at: new Date().toISOString() });

  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  revalidatePath("/pedidos", "layout");
  return {};
}
