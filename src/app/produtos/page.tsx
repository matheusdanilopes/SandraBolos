import { supabase } from "@/lib/supabase";
import { ProdutosClient } from "./ProdutosClient";
import type { ProdutoComCategoria, CategoriaProduto } from "@/types/database";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const [produtosResult, categoriasResult] =
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
    ]);

  const { data: produtosData } = produtosResult;
  const { data: categoriasData } = categoriasResult;
  const semConexao = houveErroDeConexao(produtosResult, categoriasResult);

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
      />
    </div>
  );
}
