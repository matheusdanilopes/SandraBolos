import Link from "next/link";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { type PedidoComCliente } from "@/types/database";
import { Plus } from "lucide-react";
import { DashboardClient } from "./DashboardClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPeriodoRange, isValidPreset } from "@/lib/periodo";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = cookies();
  const presetRaw = cookieStore.get("sb_periodo")?.value ?? "mes_atual";
  const preset = isValidPreset(presetRaw) ? presetRaw : "mes_atual";
  const de = cookieStore.get("sb_periodo_de")?.value;
  const ate = cookieStore.get("sb_periodo_ate")?.value;
  const periodo = getPeriodoRange(preset, de, ate);

  const [pedidosResult, receitaResult, feitosResult] = await Promise.all([
    supabase
      .from("pedidos")
      .select("*, clientes(nome, telefone)")
      .neq("status", "entregue")
      .neq("status", "cancelado")
      .order("data_entrega", { ascending: true }),

    supabase
      .from("pedidos")
      .select("valor_cobrado")
      .eq("status", "entregue")
      .gte("data_entrega", periodo.inicio)
      .lte("data_entrega", periodo.fim),

    supabase
      .from("pedidos")
      .select("valor_calculado, preco_corrigido")
      .eq("status", "feito"),
  ]);

  const receitaPeriodo =
    receitaResult.data?.reduce((acc, p) => acc + (p.valor_cobrado ?? 0), 0) ?? 0;

  const aReceber =
    feitosResult.data?.reduce(
      (acc, p) => acc + (p.preco_corrigido ?? p.valor_calculado ?? 0),
      0
    ) ?? 0;

  const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 capitalize">{hoje}</p>
        </div>
        <Link href="/pedidos/novo" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          Novo Pedido
        </Link>
      </div>

      <DashboardClient
        pedidos={(pedidosResult.data ?? []) as unknown as PedidoComCliente[]}
        receitaPeriodo={receitaPeriodo}
        periodoLabel={periodo.label}
        aReceber={aReceber}
      />
    </div>
  );
}
