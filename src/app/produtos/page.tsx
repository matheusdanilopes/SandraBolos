import { ProdutosClient } from "./ProdutosClient";
import type { ProdutoComCategoria, CategoriaProduto, CardapioConfig } from "@/types/database";
import {
  lerProdutosComCategoria,
  lerCategoriasProduto,
  lerConfigCardapio,
} from "@/lib/dadosDeApoio";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  // A tela inteira é catálogo: nada aqui muda entre uma visita e outra, então
  // tudo vem do cache e a página deixa de esperar três consultas.
  const [produtosResult, categoriasResult, configResult] = await Promise.all([
    lerProdutosComCategoria(),
    lerCategoriasProduto(),
    lerConfigCardapio(),
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
