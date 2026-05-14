import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { CategoriasSection } from "./CategoriasSection";
import { CategoriasProdutoSection } from "./CategoriasProdutoSection";
import { CardapioVisual } from "../produtos/CardapioVisual";
import type { CategoriaCusto, CategoriaProduto, ProdutoComCategoria, CardapioConfig } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [
    { data: categoriasCusto },
    { data: categoriasProduto },
    { data: produtosData },
    { data: configData },
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
  ]);

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Configurações</h1>

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
