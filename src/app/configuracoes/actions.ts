"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { mensagemErro } from "@/lib/erros";
import {
  invalidarDadosDeApoio,
  TAG_CATEGORIAS_CUSTO,
  TAG_CATEGORIAS_PRODUTO,
  TAG_PRODUTOS,
} from "@/lib/dadosDeApoio";

export async function adicionarCategoriaAction(nome: string): Promise<{ error?: string }> {
  const nomeTrimmed = nome.trim();
  if (nomeTrimmed.length < 2) return { error: "Nome deve ter ao menos 2 caracteres." };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("categorias_custo").insert({ nome: nomeTrimmed });
  if (error) return { error: mensagemErro(error) };

  invalidarDadosDeApoio(TAG_CATEGORIAS_CUSTO);
  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
  return {};
}

export async function excluirCategoriaAction(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("categorias_custo").delete().eq("id", id);
  if (error) return { error: mensagemErro(error) };

  invalidarDadosDeApoio(TAG_CATEGORIAS_CUSTO);
  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
  return {};
}

// ─── Categorias de Produto ────────────────────────────────────────────────────

export async function adicionarCategoriaProdutoAction(
  nome: string,
  ordemAtual: number
): Promise<{ error?: string }> {
  const nomeTrimmed = nome.trim();
  if (nomeTrimmed.length < 2) return { error: "Nome deve ter ao menos 2 caracteres." };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("categorias_produto")
    .insert({ nome: nomeTrimmed, ordem: ordemAtual + 1 });
  if (error) return { error: mensagemErro(error) };

  invalidarDadosDeApoio(TAG_CATEGORIAS_PRODUTO);
  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
  return {};
}

export async function editarCategoriaProdutoAction(
  id: string,
  nome: string
): Promise<{ error?: string }> {
  const nomeTrimmed = nome.trim();
  if (nomeTrimmed.length < 2) return { error: "Nome deve ter ao menos 2 caracteres." };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("categorias_produto")
    .update({ nome: nomeTrimmed })
    .eq("id", id);
  if (error) return { error: mensagemErro(error) };

  invalidarDadosDeApoio(TAG_CATEGORIAS_PRODUTO);
  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
  return {};
}

export async function excluirCategoriaProdutoAction(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: emUso } = await supabase
    .from("produtos")
    .select("id")
    .eq("categoria_id", id)
    .limit(1);

  if (emUso && emUso.length > 0) {
    return { error: "Categoria em uso por produtos. Remova a categoria dos produtos antes de excluir." };
  }

  const { error } = await supabase.from("categorias_produto").delete().eq("id", id);
  if (error) return { error: mensagemErro(error) };

  // Também o cache de produtos: a checagem acima e o delete não são atômicos, e
  // a FK é `on delete set null` — um produto que entrasse na categoria nesse
  // intervalo teria o `categoria_id` zerado pelo banco, sem o app saber.
  invalidarDadosDeApoio(TAG_CATEGORIAS_PRODUTO, TAG_PRODUTOS);
  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
  return {};
}

export async function toggleCategoriaProdutoAtivoAction(
  id: string,
  ativo: boolean
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("categorias_produto")
    .update({ ativo })
    .eq("id", id);
  if (error) return { error: mensagemErro(error) };

  invalidarDadosDeApoio(TAG_CATEGORIAS_PRODUTO);
  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
  return {};
}

export async function reordenarCategoriaProdutoAction(
  updates: { id: string; ordem: number }[]
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  for (const { id, ordem } of updates) {
    const { error } = await supabase
      .from("categorias_produto")
      .update({ ordem })
      .eq("id", id);
    if (error) return { error: mensagemErro(error) };
  }

  invalidarDadosDeApoio(TAG_CATEGORIAS_PRODUTO);
  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
  return {};
}
