"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function adicionarCategoriaAction(nome: string): Promise<{ error?: string }> {
  const nomeTrimmed = nome.trim();
  if (nomeTrimmed.length < 2) return { error: "Nome deve ter ao menos 2 caracteres." };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("categorias_custo").insert({ nome: nomeTrimmed });
  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
  return {};
}

export async function excluirCategoriaAction(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("categorias_custo").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
  return {};
}
