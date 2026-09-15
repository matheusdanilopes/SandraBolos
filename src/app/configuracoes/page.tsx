import { CategoriasSection } from "./CategoriasSection";
import { CategoriasProdutoSection } from "./CategoriasProdutoSection";
import { CardapioVisual } from "../produtos/CardapioVisual";
import type { CategoriaCusto, CategoriaProduto, ProdutoComCategoria, CardapioConfig } from "@/types/database";
import {
  lerCategoriasCusto,
  lerCategoriasProduto,
  lerProdutosAtivosComCategoria,
  lerConfigCardapio,
} from "@/lib/dadosDeApoio";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [
    categoriasCustoResult,
    categoriasProdutoResult,
    produtosResult,
    configResult,
  ] = await Promise.all([
    // Tela de cadastro: tudo aqui é dado de apoio e vem do cache.
    lerCategoriasCusto(),
    lerCategoriasProduto(),
    lerProdutosAtivosComCategoria(),
    lerConfigCardapio(),
  ]);

  const { data: categoriasCusto } = categoriasCustoResult;
  const { data: categoriasProduto } = categoriasProdutoResult;
  const { data: produtosData } = produtosResult;
  const { data: configData } = configResult;
  const semConexao = houveErroDeConexao(
    categoriasCustoResult,
    categoriasProdutoResult,
    produtosResult,
    configResult
  );

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Configurações</h1>

      {semConexao && <AvisoConexao />}

      <CategoriasSection categorias={(categoriasCusto ?? []) as CategoriaCusto[]} />

      <CategoriasProdutoSection categorias={(categoriasProduto ?? []) as CategoriaProduto[]} />

      <div className="space-y-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Cardápio Visual</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Personalize e exporte seu cardápio como imagem PNG para compartilhar.
          </p>
        </div>
        <CardapioVisual
          produtos={(produtosData ?? []) as ProdutoComCategoria[]}
          categorias={(categoriasProduto ?? []) as CategoriaProduto[]}
          configInicial={(configData ?? null) as CardapioConfig | null}
        />
      </div>
    </div>
  );
}
