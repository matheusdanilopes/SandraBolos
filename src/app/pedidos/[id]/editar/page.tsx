import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PedidoForm } from "../../PedidoForm";
import { type Pedido } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({ params }: { params: { id: string } }) {
  const [{ data: pedido }, { data: clientes }] = await Promise.all([
    supabase.from("pedidos").select("*").eq("id", params.id).single(),
    supabase.from("clientes").select("id, nome, telefone").order("nome"),
  ]);

  if (!pedido) notFound();

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Editar Pedido</h1>
      <PedidoForm clientes={clientes ?? []} pedido={pedido as unknown as Pedido} />
    </div>
  );
}
