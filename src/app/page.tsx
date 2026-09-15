import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { type PedidoCalendario, type PedidoComCliente } from "@/types/database";
import { DashboardClient } from "./DashboardClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPeriodoRange, isValidPreset } from "@/lib/periodo";
import { calcularValorFinal } from "@/lib/utils";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = cookies();
  const presetRaw = cookieStore.get("sb_periodo")?.value ?? "mes_atual";
  const preset = isValidPreset(presetRaw) ? presetRaw : "mes_atual";
  const de = cookieStore.get("sb_periodo_de")?.value;
  const ate = cookieStore.get("sb_periodo_ate")?.value;
  const periodo = getPeriodoRange(preset, de, ate);

  const [pedidosResult, receitaResult, feitosResult, calendarioResult] = await Promise.all([
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
      .select("valor_calculado, preco_corrigido, valor_brinde")
      .eq("status", "feito"),

    // Calendário: os entregues também contam, então esta busca não pode se
    // apoiar na lista de pedidos ativos acima.
    supabase
      .from("pedidos")
      .select("id, data_entrega, status, tipo, hora_entrega, hora_retirada, nome_cliente, clientes(nome)")
      .neq("status", "cancelado")
      .order("data_entrega", { ascending: true }),
  ]);

  const receitaPeriodo =
    receitaResult.data?.reduce((acc, p) => acc + (p.valor_cobrado ?? 0), 0) ?? 0;

  const aReceber =
    feitosResult.data?.reduce((acc, p) => acc + (calcularValorFinal(p) ?? 0), 0) ?? 0;

  const semConexao = houveErroDeConexao(
    pedidosResult,
    receitaResult,
    feitosResult,
    calendarioResult
  );

  const hojeBruto = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const hoje = hojeBruto.charAt(0).toUpperCase() + hojeBruto.slice(1);

  return (
    <div className="py-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400">{hoje}</p>
      </div>

      {semConexao && <AvisoConexao detalhe="Os números abaixo podem estar incompletos." />}

      <DashboardClient
        pedidos={(pedidosResult.data ?? []) as unknown as PedidoComCliente[]}
        receitaPeriodo={receitaPeriodo}
        periodoLabel={periodo.label}
        aReceber={aReceber}
        pedidosCalendario={(calendarioResult.data ?? []) as unknown as PedidoCalendario[]}
      />
    </div>
  );
}
