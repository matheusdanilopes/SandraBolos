import { supabase } from "@/lib/supabase";
import { PedidoForm } from "../PedidoForm";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, telefone")
    .order("nome");

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Novo Pedido</h1>
      <PedidoForm clientes={clientes ?? []} />
    </div>
  );
}
