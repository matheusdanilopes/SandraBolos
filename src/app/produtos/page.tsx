import { supabase } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ProdutosClient } from "./ProdutosClient";
import type { Produto, CardapioConfig } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const [{ data: produtosData }, { data: configData }] = await Promise.all([
    supabase
      .from("produtos")
      .select("*")
      .order("ativo", { ascending: false })
      .order("nome"),
    createServerSupabaseClient()
      .from("cardapio_config")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single(),
  ]);

  const produtos = (produtosData ?? []) as Produto[];
  const configCardapio = (configData ?? null) as CardapioConfig | null;

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
      <p className="text-xs text-gray-500 -mt-2">
        Gerencie o catálogo de produtos. Alterações de preço não afetam pedidos já criados.
      </p>
      <ProdutosClient produtos={produtos} configCardapio={configCardapio} />
    </div>
  );
}
