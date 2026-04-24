import { supabase } from "@/lib/supabase";
import { FinanceiroClient } from "./FinanceiroClient";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const [{ data: entregues }, { data: ativos }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, data_entrega, valor_cobrado, tipo, clientes(nome)")
      .eq("status", "entregue")
      .order("data_entrega", { ascending: false }),
    supabase
      .from("pedidos")
      .select("preco_corrigido, valor_calculado")
      .neq("status", "entregue"),
  ]);

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={20} className="text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>
      </div>

      <FinanceiroClient
        pedidosEntregues={(entregues ?? []) as any}
        pedidosAtivos={ativos ?? []}
      />
    </div>
  );
}
