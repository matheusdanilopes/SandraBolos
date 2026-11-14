import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { CategoriasSection } from "./CategoriasSection";
import { CategoriasProdutoSection } from "./CategoriasProdutoSection";
import { FotosCardapioSection } from "./FotosCardapioSection";
import type { CategoriaCusto, CategoriaProduto, CardapioFoto } from "@/types/database";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [
    categoriasCustoResult,
    categoriasProdutoResult,
    fotosResult,
  ] = await Promise.all([
    supabase.from("categorias_custo").select("*").order("nome"),
    supabase.from("categorias_produto").select("*").order("ordem").order("nome"),
    createServerSupabaseClient()
      .from("cardapio_fotos")
      .select("*")
      .order("ordem")
      .order("created_at"),
  ]);

  const { data: categoriasCusto } = categoriasCustoResult;
  const { data: categoriasProduto } = categoriasProdutoResult;
  const { data: fotosData } = fotosResult;
  const semConexao = houveErroDeConexao(
    categoriasCustoResult,
    categoriasProdutoResult,
    fotosResult
  );

  return (
    <div className="py-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Configurações</h1>

      {semConexao && <AvisoConexao />}

      <CategoriasSection categorias={(categoriasCusto ?? []) as CategoriaCusto[]} />

      <CategoriasProdutoSection categorias={(categoriasProduto ?? []) as CategoriaProduto[]} />

      <FotosCardapioSection fotos={(fotosData ?? []) as CardapioFoto[]} />
    </div>
  );
}
