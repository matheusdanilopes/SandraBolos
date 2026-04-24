"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { TipoSabor } from "@/types/database";

export async function criarSaborAction(
  nome: string,
  tipo: TipoSabor,
  precoPorKg: number | null,
  precoPorCento: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("sabores")
    .insert({ nome: nome.trim(), tipo, preco_por_kg: precoPorKg, preco_por_cento: precoPorCento });

  if (error) return { error: error.message };

  revalidatePath("/sabores");
  redirect("/sabores");
}

export async function editarSaborAction(
  id: string,
  nome: string,
  tipo: TipoSabor,
  ativo: boolean,
  precoPorKg: number | null,
  precoPorCento: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("sabores")
    .update({ nome: nome.trim(), tipo, ativo, preco_por_kg: precoPorKg, preco_por_cento: precoPorCento })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/sabores");
  redirect("/sabores");
}

export async function deletarSaborAction(
  id: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("sabores").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/sabores");
  return {};
}
