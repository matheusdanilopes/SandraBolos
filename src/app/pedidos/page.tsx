import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PedidosList } from "./PedidosList";
import { type PedidoComCliente } from "@/types/database";
import { Plus } from "lucide-react";
import { isErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";
import {
  COLUNAS_PEDIDO_LISTA,
  MESES_DE_HISTORICO,
  filtroDeHistorico,
} from "@/lib/consultas";

export const dynamic = "force-dynamic";

/**
 * `?filtro=` deixa o dashboard abrir a lista já no recorte que a pessoa tocou
 * (hoje, semana, atrasados...). Valor inválido cai em "todos" na própria lista.
 */
export default async function PedidosPage({
  searchParams,
}: {
  searchParams?: { filtro?: string; historico?: string };
}) {
  // Por padrão a lista carrega o trabalho em aberto (qualquer data) mais o
  // histórico encerrado dos últimos meses, em vez do banco inteiro a cada
  // abertura. `?historico=tudo` traz tudo, para quando a Sandra procura um
  // pedido antigo.
  const historicoCompleto = searchParams?.historico === "tudo";

  const query = supabase
    .from("pedidos")
    .select(`${COLUNAS_PEDIDO_LISTA}, clientes(nome)`);

  const { data: pedidos, error } = await (
    historicoCompleto ? query : query.or(filtroDeHistorico())
  ).order("data_entrega", { ascending: true });

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
        <Link href="/pedidos/novo" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          Novo
        </Link>
      </div>

      {isErroDeConexao(error) && <AvisoConexao detalhe="A lista pode estar incompleta." />}

      <PedidosList
        pedidos={(pedidos ?? []) as unknown as PedidoComCliente[]}
        filtroInicial={searchParams?.filtro}
        historicoCompleto={historicoCompleto}
        mesesDeHistorico={MESES_DE_HISTORICO}
      />
    </div>
  );
}
