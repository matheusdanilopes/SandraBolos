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
      <div>
        <h1 className="text-xl font-bold text-gray-900">Toppers</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Toppers de fornecedores para pedidos com decoração
        </p>
      </div>
      <ToppersList pedidos={(pedidos ?? []) as unknown as PedidoComTopper[]} />
    </div>
  );
}
