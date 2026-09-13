import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PedidoForm } from "../../PedidoForm";
import { type Pedido } from "@/types/database";
import { houveErroDeConexao } from "@/lib/erros";
import { PainelSemConexao } from "@/components/PainelSemConexao";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({ params }: { params: { id: string } }) {
  const [pedidoResult, clientesResult] = await Promise.all([
    supabase.from("pedidos").select("*").eq("id", params.id).single(),
    supabase.from("clientes").select("id, nome, telefone").order("nome"),
  ]);

  const { data: pedido } = pedidoResult;
  const { data: clientes } = clientesResult;

  // Falha de rede não é pedido inexistente: mandar para o 404 faria parecer
  // que o pedido foi apagado.
  if (houveErroDeConexao(pedidoResult, clientesResult))
    return <PainelSemConexao titulo="Não foi possível carregar o pedido" />;
  if (!pedido) notFound();

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Editar Pedido</h1>
      <PedidoForm clientes={clientes ?? []} pedido={pedido as unknown as Pedido} />
    </div>
  );
}
