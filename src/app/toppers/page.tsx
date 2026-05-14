import { supabase } from "@/lib/supabase";
import { ToppersList } from "./ToppersList";
import { Sparkles } from "lucide-react";
import type { PedidoComTopper } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ToppersPage() {
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, clientes(nome, telefone), toppers_pedido(*)")
    .in("topper", ["sim", "brinde"])
    .order("data_entrega", { ascending: true });

  const lista = (pedidos ?? []) as unknown as PedidoComTopper[];

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 rounded-xl p-2.5 flex-shrink-0">
          <Sparkles className="text-purple-600" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Toppers</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {lista.length === 0
              ? "Nenhum pedido com topper"
              : `${lista.length} pedido${lista.length !== 1 ? "s" : ""} com topper`}
          </p>
        </div>
      </div>
      <ToppersList pedidos={lista} />
    </div>
  );
}
