import { supabase } from "@/lib/supabase";
import { PedidoForm } from "../PedidoForm";
import type { Produto } from "@/types/database";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const [clientesResult, produtosResult] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone").order("nome"),
    supabase.from("produtos").select("*").eq("ativo", true).order("nome"),
  ]);

  const { data: clientes } = clientesResult;
  const { data: produtos } = produtosResult;
  // Com a lista de clientes vazia por falha de rede é fácil cadastrar um cliente
  // repetido sem perceber — daí o aviso antes do formulário.
  const semConexao = houveErroDeConexao(clientesResult, produtosResult);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Novo Pedido</h1>
      {semConexao && (
        <AvisoConexao detalhe="As listas de clientes e produtos podem estar incompletas." />
      )}

      <PedidoForm clientes={clientes ?? []} produtos={(produtos ?? []) as Produto[]} />
    </div>
  );
}
