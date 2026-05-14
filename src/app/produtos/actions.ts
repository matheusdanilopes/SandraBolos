"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { UnidadeMedida } from "@/types/database";

interface ProdutoPayload {
  nome: string;
  unidade_medida: UnidadeMedida;
  preco_padrao: number;
  categoria_id?: string | null;
}

export async function criarProdutoAction(
  data: ProdutoPayload
): Promise<{ error?: string }> {
  if (!data.nome.trim()) return { error: "Nome é obrigatório" };
  if (data.preco_padrao < 0) return { error: "Preço inválido" };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("produtos").insert({
    nome: data.nome.trim(),
    unidade_medida: data.unidade_medida,
    preco_padrao: data.preco_padrao,
    categoria_id: data.categoria_id ?? null,
    ativo: true,
  });

  if (error) return { error: error.message };
  revalidatePath("/produtos");
  return {};
}

export async function editarProdutoAction(
  id: string,
  data: ProdutoPayload & { ativo: boolean }
): Promise<{ error?: string }> {
  if (!data.nome.trim()) return { error: "Nome é obrigatório" };
  if (data.preco_padrao < 0) return { error: "Preço inválido" };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("produtos")
    .update({
      nome: data.nome.trim(),
      unidade_medida: data.unidade_medida,
      preco_padrao: data.preco_padrao,
      categoria_id: data.categoria_id ?? null,
      ativo: data.ativo,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/produtos");
  return {};
}

export async function toggleAtivoAction(
  id: string,
  ativo: boolean
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("produtos")
    .update({ ativo })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/produtos");
  return {};
}
