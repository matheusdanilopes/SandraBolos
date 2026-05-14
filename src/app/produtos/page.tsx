import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ProdutosClient } from "./ProdutosClient";
import type { ProdutoComCategoria, CategoriaProduto, CardapioConfig } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const [{ data: produtosData }, { data: categoriasData }, { data: configData }] =
    await Promise.all([
      supabase
        .from("produtos")
        .select("*, categorias_produto(nome, ordem)")
        .order("ativo", { ascending: false })
        .order("nome"),
      supabase
        .from("categorias_produto")
        .select("*")
        .order("ordem")
        .order("nome"),
      createServerSupabaseClient()
        .from("cardapio_config")
        .select("*")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single(),
    ]);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
      <p className="text-xs text-gray-500 -mt-2">
        Gerencie o catálogo de produtos. Alterações de preço não afetam pedidos já criados.
      </p>
      <ProdutosClient
        produtos={(produtosData ?? []) as ProdutoComCategoria[]}
        categorias={(categoriasData ?? []) as CategoriaProduto[]}
        configCardapio={(configData ?? null) as CardapioConfig | null}
      />
    </div>
  );
}
