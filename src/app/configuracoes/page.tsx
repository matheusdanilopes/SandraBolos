import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { CategoriasSection } from "./CategoriasSection";
import { CategoriasProdutoSection } from "./CategoriasProdutoSection";
import { FotosCardapioSection } from "./FotosCardapioSection";
import { CardapioVisual } from "../produtos/CardapioVisual";
import type { CategoriaCusto, CategoriaProduto, ProdutoComCategoria, CardapioConfig, CardapioFoto } from "@/types/database";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [
    categoriasCustoResult,
    categoriasProdutoResult,
    produtosResult,
    configResult,
    fotosResult,
  ] = await Promise.all([
    supabase.from("categorias_custo").select("*").order("nome"),
    supabase.from("categorias_produto").select("*").order("ordem").order("nome"),
    supabase
      .from("produtos")
      .select("*, categorias_produto(nome, ordem)")
      .eq("ativo", true)
      .order("nome"),
    createServerSupabaseClient()
      .from("cardapio_config")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single(),
    createServerSupabaseClient()
      .from("cardapio_fotos")
      .select("*")
      .order("ordem")
      .order("created_at"),
  ]);

  const { data: categoriasCusto } = categoriasCustoResult;
  const { data: categoriasProduto } = categoriasProdutoResult;
  const { data: produtosData } = produtosResult;
  const { data: configData } = configResult;
  const { data: fotosData } = fotosResult;
  const semConexao = houveErroDeConexao(
    categoriasCustoResult,
    categoriasProdutoResult,
    produtosResult,
    configResult,
    fotosResult
  );

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Configurações</h1>

      {semConexao && <AvisoConexao />}

      <CategoriasSection categorias={(categoriasCusto ?? []) as CategoriaCusto[]} />

      <CategoriasProdutoSection categorias={(categoriasProduto ?? []) as CategoriaProduto[]} />

      <FotosCardapioSection fotos={(fotosData ?? []) as CardapioFoto[]} />

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
