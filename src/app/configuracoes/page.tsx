import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { CategoriasSection } from "./CategoriasSection";
import { CategoriasProdutoSection } from "./CategoriasProdutoSection";
import { FotosCardapioSection } from "./FotosCardapioSection";
import type { CategoriaCusto, CategoriaProduto, CardapioFoto } from "@/types/database";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

const DIAS_GRAFICO = 30;

// Data de hoje no horário de Brasília, no formato AAAA-MM-DD (o mesmo da view)
function hojeEmBrasilia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function diasAteHoje(hoje: string, quantidade: number) {
  const base = new Date(`${hoje}T12:00:00Z`);
  return Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - (quantidade - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

export default async function ConfiguracoesPage() {
  const dias = diasAteHoje(hojeEmBrasilia(), DIAS_GRAFICO);
  const serverSupabase = createServerSupabaseClient();

  const [
    categoriasCustoResult,
    categoriasProdutoResult,
    fotosResult,
    acessosPorDiaResult,
    acessosTotalResult,
  ] = await Promise.all([
    supabase.from("categorias_custo").select("*").order("nome"),
    supabase.from("categorias_produto").select("*").order("ordem").order("nome"),
    serverSupabase
      .from("cardapio_fotos")
      .select("*")
      .order("ordem")
      .order("created_at"),
    serverSupabase
      .from("cardapio_acessos_por_dia")
      .select("dia, total")
      .gte("dia", dias[0]),
    serverSupabase
      .from("cardapio_acessos")
      .select("id", { count: "exact", head: true }),
  ]);

  // Sem a migration 016 as consultas de acessos falham: o resto da tela segue normal
  const porDia = new Map((acessosPorDiaResult.data ?? []).map((r) => [r.dia, r.total]));
  const acessos = acessosPorDiaResult.error || acessosTotalResult.error
    ? null
    : {
        total: acessosTotalResult.count ?? 0,
        porDia: dias.map((dia) => ({ dia, total: porDia.get(dia) ?? 0 })),
      };

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

      <FotosCardapioSection fotos={(fotosData ?? []) as CardapioFoto[]} acessos={acessos} />
    </div>
  );
}
