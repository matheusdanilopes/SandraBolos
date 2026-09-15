import { supabase } from "@/lib/supabase";
import { ToppersList } from "./ToppersList";
import { Sparkles } from "lucide-react";
import type { PedidoComTopper } from "@/types/database";
import { COLUNAS_PEDIDO_TOPPER, COLUNAS_TOPPER_PEDIDO } from "@/lib/consultas";
import { isErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function ToppersPage() {
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select(
      `${COLUNAS_PEDIDO_TOPPER}, clientes(nome), toppers_pedido(${COLUNAS_TOPPER_PEDIDO})`
    )
    // Brinde não é compra de fornecedor: fica fora desta tela, que existe para
    // acompanhar solicitação, recebimento e pagamento do topper encomendado.
    .eq("topper", "sim")
    // Pedido cancelado não tem topper a solicitar, receber ou pagar. Ele fica
    // de fora aqui, na origem, para sumir junto dos contadores, dos filtros e
    // dos totais — todos saem desta mesma lista.
    .neq("status", "cancelado")
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
              ? "Nenhum topper encomendado"
              : `${lista.length} pedido${lista.length !== 1 ? "s" : ""} com topper encomendado`}
          </p>
        </div>
      </div>
      {isErroDeConexao(error) && <AvisoConexao detalhe="A lista pode estar incompleta." />}

      <ToppersList pedidos={lista} />
    </div>
  );
}
