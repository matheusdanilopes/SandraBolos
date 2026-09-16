import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PedidosList } from "./PedidosList";
import { type PedidoComCliente } from "@/types/database";
import { Plus } from "lucide-react";
import { isErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

/**
 * `?filtro=` deixa o dashboard abrir a lista já no recorte que a pessoa tocou
 * (hoje, semana, atrasados...). Valor inválido cai em "todos" na própria lista.
 */
export default async function PedidosPage({
  searchParams,
}: {
  searchParams?: { filtro?: string };
}) {
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("*, clientes(nome, telefone)")
    .order("data_entrega", { ascending: true });

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
      />
    </div>
  );
}
