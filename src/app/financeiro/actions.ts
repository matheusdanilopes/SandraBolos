"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function adicionarCustoAction(
  descricao: string,
  valor: number,
  data: string,
  categoriaId: string | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("custos").insert({
    descricao,
    valor,
    data,
    categoria_id: categoriaId,
  });
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return {};
}

export async function excluirCustoAction(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("custos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/financeiro");
  return {};
}
