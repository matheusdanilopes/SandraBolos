import { PedidoForm } from "../PedidoForm";
import type { ProdutoParaSelecao } from "@/types/database";
import { lerClientesParaSelecao, lerProdutosAtivos } from "@/lib/dadosDeApoio";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  // Clientes e catálogo vêm do cache: o formulário abre sem esperar duas idas
  // ao Supabase que devolvem quase sempre a mesma coisa.
  const [clientesResult, produtosResult] = await Promise.all([
    lerClientesParaSelecao(),
    lerProdutosAtivos(),
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

      <PedidoForm clientes={clientes ?? []} produtos={(produtos ?? []) as ProdutoParaSelecao[]} />
    </div>
  );
}
