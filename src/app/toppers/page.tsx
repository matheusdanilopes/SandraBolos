import { supabase } from "@/lib/supabase";
import { ToppersList } from "./ToppersList";
import type { PedidoComTopper } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ToppersPage() {
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, clientes(nome, telefone), toppers_pedido(*)")
    .in("topper", ["sim", "brinde"])
    .order("data_entrega", { ascending: true });

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Toppers</h1>
      </div>
      <ToppersList pedidos={(pedidos ?? []) as unknown as PedidoComTopper[]} />
    </div>
  );
}
