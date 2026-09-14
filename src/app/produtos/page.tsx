import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ProdutosClient } from "./ProdutosClient";
import type { ProdutoComCategoria, CategoriaProduto, CardapioConfig } from "@/types/database";
import { COLUNAS_PRODUTO } from "@/lib/consultas";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const [produtosResult, categoriasResult, configResult] =
    await Promise.all([
      supabase
        .from("produtos")
        .select(`${COLUNAS_PRODUTO}, categorias_produto(nome, ordem)`)
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

  const { data: produtosData } = produtosResult;
  const { data: categoriasData } = categoriasResult;
  const { data: configData } = configResult;
  const semConexao = houveErroDeConexao(produtosResult, categoriasResult, configResult);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
      <p className="text-xs text-gray-500 -mt-2">
        Gerencie o catálogo de produtos. Alterações de preço não afetam pedidos já criados.
      </p>
      {semConexao && <AvisoConexao detalhe="O catálogo pode estar incompleto." />}

      <ProdutosClient
        produtos={(produtosData ?? []) as ProdutoComCategoria[]}
        categorias={(categoriasData ?? []) as CategoriaProduto[]}
        configCardapio={(configData ?? null) as CardapioConfig | null}
      />
    </div>
  );
}
