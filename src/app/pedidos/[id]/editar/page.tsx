import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PedidoForm } from "../../PedidoForm";
import { type Pedido, type TopperPedido } from "@/types/database";
import { lerClientesParaSelecao } from "@/lib/dadosDeApoio";
import { houveErroDeConexao } from "@/lib/erros";
import { PainelSemConexao } from "@/components/PainelSemConexao";

export const dynamic = "force-dynamic";

export default async function EditarPedidoPage({ params }: { params: { id: string } }) {
  const [pedidoResult, clientesResult, topperResult] = await Promise.all([
    supabase.from("pedidos").select("*").eq("id", params.id).single(),
    lerClientesParaSelecao(),
    // A ficha do topper vem junto para o formulário abrir com fornecedor e
    // valores já registrados — salvar a edição não pode apagá-los.
    supabase.from("toppers_pedido").select("*").eq("pedido_id", params.id).maybeSingle(),
  ]);

  const { data: pedido } = pedidoResult;
  const { data: clientes } = clientesResult;
  const { data: topperPedido } = topperResult;

  // Falha de rede não é pedido inexistente: mandar para o 404 faria parecer
  // que o pedido foi apagado.
  if (houveErroDeConexao(pedidoResult, clientesResult, topperResult))
    return <PainelSemConexao titulo="Não foi possível carregar o pedido" />;
  if (!pedido) notFound();

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Editar Pedido</h1>
      <PedidoForm
        clientes={clientes ?? []}
        pedido={pedido as unknown as Pedido}
        topperPedido={(topperPedido as unknown as TopperPedido | null) ?? null}
      />
    </div>
  );
}
