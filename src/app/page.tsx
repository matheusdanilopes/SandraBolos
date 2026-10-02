import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { type PedidoCalendario, type PedidoComCliente } from "@/types/database";
import { DashboardClient } from "./DashboardClient";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPeriodoRange, isValidPreset } from "@/lib/periodo";
import { pedidosPrevistos, resumirPrevisto } from "@/lib/receitaFutura";
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

  const agora = new Date();
  const hojeISO = format(agora, "yyyy-MM-dd");
  const inicioMes = format(startOfMonth(agora), "yyyy-MM-dd");
  const fimMes = format(endOfMonth(agora), "yyyy-MM-dd");

  const [pedidosResult, receitaResult, receitaMesResult, calendarioResult] = await Promise.all([
    // A ficha do topper vem junto porque o valor dele faz parte do valor do
    // pedido — sem ela o "a receber" e o previsto ficavam sem o topper.
    supabase
      .from("pedidos")
      .select("*, clientes(nome, telefone), toppers_pedido(valor), itens_pedido(valor_total)")
      .neq("status", "entregue")
      .neq("status", "cancelado")
      .order("data_entrega", { ascending: true }),

    supabase
      .from("pedidos")
      .select("valor_cobrado")
      .eq("status", "entregue")
      .gte("data_entrega", periodo.inicio)
      .lte("data_entrega", periodo.fim),

    // O que já entrou no mês corrente, para projetar o fechamento — não
    // depende do período escolhido, que pode ser outro.
    supabase
      .from("pedidos")
      .select("valor_cobrado")
      .eq("status", "entregue")
      .gte("data_entrega", inicioMes)
      .lte("data_entrega", fimMes),

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

  const pedidos = (pedidosResult.data ?? []) as unknown as PedidoComCliente[];

  // Previsto até o fim do mês: tudo o que está confirmado para este mês e ainda
  // não saiu, inclusive os atrasados — eles também devem entrar neste mês.
  const previstoMes = resumirPrevisto(pedidosPrevistos(pedidos, inicioMes, fimMes), hojeISO);
  const realizadoMes =
    receitaMesResult.data?.reduce((acc, p) => acc + (p.valor_cobrado ?? 0), 0) ?? 0;

  const semConexao = houveErroDeConexao(
    pedidosResult,
    receitaResult,
    receitaMesResult,
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
        pedidos={pedidos}
        receitaPeriodo={receitaPeriodo}
        periodoLabel={periodo.label}
        previstoMes={previstoMes}
        realizadoMes={realizadoMes}
        fimMes={format(endOfMonth(agora), "dd/MM")}
        pedidosCalendario={(calendarioResult.data ?? []) as unknown as PedidoCalendario[]}
      />
    </div>
  );
}
