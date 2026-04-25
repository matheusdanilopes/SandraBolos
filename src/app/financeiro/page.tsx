import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { type PedidoComCliente, type CustoComPedido } from "@/types/database";
import { FinanceiroClient } from "./FinanceiroClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { mes?: string; ano?: string };
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const hoje = new Date();
  const mes = Number(searchParams.mes) || hoje.getMonth() + 1;
  const ano = Number(searchParams.ano) || hoje.getFullYear();

  const inicioMes = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fimMes = new Date(ano, mes, 0).toISOString().slice(0, 10);

  const supabase = createServerSupabaseClient();

  const [{ data: pedidos }, { data: custos }] = await Promise.all([
    supabase
      .from("pedidos")
      .select("*, clientes(nome)")
      .eq("status", "entregue")
      .gte("data_entrega", inicioMes)
      .lte("data_entrega", fimMes)
      .order("data_entrega", { ascending: false }),
    supabase
      .from("custos")
      .select("*, pedidos(nome_cliente, descricao)")
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .order("data", { ascending: false }),
  ]);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>
      <FinanceiroClient
        pedidosEntregues={(pedidos ?? []) as unknown as PedidoComCliente[]}
        custos={(custos ?? []) as unknown as CustoComPedido[]}
        mes={mes}
        ano={ano}
      />
    </div>
  );
}
