"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { mensagemErro } from "@/lib/erros";

export async function adicionarCategoriaAction(nome: string): Promise<{ error?: string }> {
  const nomeTrimmed = nome.trim();
  if (nomeTrimmed.length < 2) return { error: "Nome deve ter ao menos 2 caracteres." };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("categorias_custo").insert({ nome: nomeTrimmed });
  if (error) return { error: mensagemErro(error) };

  revalidatePath("/configuracoes");
  revalidatePath("/financeiro");
  return {};
}

export async function excluirCategoriaAction(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("categorias_custo").delete().eq("id", id);
  if (error) return { error: mensagemErro(error) };

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

  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
  return {};
}

// ─── Fotos do cardápio (carrossel da página /cardapio) ───────────────────────

function revalidarFotos() {
  revalidatePath("/configuracoes");
  revalidatePath("/cardapio");
}

export async function editarLegendaFotoAction(
  id: string,
  legenda: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("cardapio_fotos")
    .update({ legenda: legenda.trim() || null })
    .eq("id", id);
  if (error) return { error: mensagemErro(error) };

  revalidarFotos();
  return {};
}

export async function toggleFotoAtivaAction(
  id: string,
  ativo: boolean
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("cardapio_fotos").update({ ativo }).eq("id", id);
  if (error) return { error: mensagemErro(error) };

  revalidarFotos();
  return {};
}

export async function reordenarFotosAction(
  updates: { id: string; ordem: number }[]
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  for (const { id, ordem } of updates) {
    const { error } = await supabase.from("cardapio_fotos").update({ ordem }).eq("id", id);
    if (error) return { error: mensagemErro(error) };
  }

  revalidarFotos();
  return {};
}

export async function excluirFotoAction(id: string): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { data: foto, error: buscaError } = await supabase
    .from("cardapio_fotos")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (buscaError) return { error: mensagemErro(buscaError) };

  const { error } = await supabase.from("cardapio_fotos").delete().eq("id", id);
  if (error) return { error: mensagemErro(error) };

  // Fotos do modelo (migration 015) ficam em public/ do app, não no bucket.
  // Arquivo órfão no bucket não quebra nada; a linha já saiu do carrossel.
  if (!foto.storage_path.startsWith("public/")) {
    await supabase.storage.from("cardapio-fotos").remove([foto.storage_path]);
  }

  revalidarFotos();
  return {};
}
