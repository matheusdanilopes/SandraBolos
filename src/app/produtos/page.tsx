import { supabase } from "@/lib/supabase";
import { ProdutosClient } from "./ProdutosClient";
import type { Produto } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const { data } = await supabase
    .from("produtos")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome");

  const produtos = (data ?? []) as Produto[];

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Produtos</h1>
      <p className="text-xs text-gray-500 -mt-2">
        Gerencie o catálogo de produtos. Alterações de preço não afetam pedidos já criados.
      </p>
      <ProdutosClient produtos={produtos} />
    </div>
  );
}
