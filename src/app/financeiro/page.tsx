import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { formatCurrency, calcularValorFinal, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import {
  TIPO_LABELS,
  type PedidoComCliente,
  type CustoComCategoria,
  type CategoriaCusto,
  type StatusPedido,
} from "@/types/database";
import { TrendingUp, Banknote, AlertCircle, TrendingDown, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CustosSection } from "./CustosSection";
import { CanceladosSection } from "./CanceladosSection";
import { ListaFinanceira, type LinhaFinanceira } from "./ListaFinanceira";
import { getPeriodoRange, getMesesNoPeriodo, isValidPreset } from "@/lib/periodo";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

/**
 * Ficha de topper com o status do pedido dono dela.
 *
 * O status vem junto porque topper de pedido cancelado não é dívida com o
 * fornecedor — ver `totalToppersAPagar` abaixo.
 */
interface TopperFinanceiro {
  valor: number;
  frete: number;
  pago_fornecedor: boolean;
  data_pagamento: string | null;
  // PostgREST devolve objeto no vínculo de muitos-para-um; o array cobre o caso
  // de ele resolver a relação como lista, para o status não sumir em silêncio.
  pedidos: { status: StatusPedido } | { status: StatusPedido }[] | null;
}

function custoDoTopper(t: TopperFinanceiro): number {
  return (t.valor ?? 0) + (t.frete ?? 0);
}

function pedidoCancelado(t: TopperFinanceiro): boolean {
  const pedido = Array.isArray(t.pedidos) ? t.pedidos[0] : t.pedidos;
  return pedido?.status === "cancelado";
}

function somar(valores: number[]): number {
  return valores.reduce((acc, v) => acc + v, 0);
}

/**
 * Valor de uma entrega. Zero conta como "não registrado": é o que o campo vale
 * quando ninguém preencheu, e mostrá-lo como R$ 0,00 com sinal de conferido
 * esconderia justamente a entrega que falta acertar.
 */
function valorDaEntrega(p: PedidoComCliente): number | null {
  return p.valor_cobrado || null;
}

function linhaDoPedido(p: PedidoComCliente, valor: number | null, semValor: string): LinhaFinanceira {
  return {
    id: p.id,
    titulo: p.clientes?.nome ?? p.nome_cliente ?? "Sem cliente",
    detalhe: `${TIPO_LABELS[p.tipo]} · ${formatDate(p.data_entrega)}`,
    valor,
    semValor,
  };
}

export default async function FinanceiroPage() {
  const cookieStore = cookies();
  const presetRaw = cookieStore.get("sb_periodo")?.value ?? "mes_atual";
  const preset = isValidPreset(presetRaw) ? presetRaw : "mes_atual";
  const de = cookieStore.get("sb_periodo_de")?.value;
  const ate = cookieStore.get("sb_periodo_ate")?.value;
  const periodo = getPeriodoRange(preset, de, ate);

  const [entreguesResult, feitosResult, canceladosResult, custosResult, categoriasResult, toppersResult] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("data_entrega, valor_cobrado, valor_calculado, preco_corrigido, valor_brinde, tipo, id, nome_cliente, created_at, clientes(nome)")
        .eq("status", "entregue")
        .gte("data_entrega", periodo.inicio)
        .lte("data_entrega", periodo.fim)
        .order("data_entrega", { ascending: false }),

      supabase
        .from("pedidos")
        .select("id, data_entrega, valor_calculado, preco_corrigido, valor_brinde, tipo, nome_cliente, created_at, clientes(nome)")
        .eq("status", "feito")
        .order("data_entrega", { ascending: true }),

      // Cancelados do período: não entram em nenhuma conta desta tela — vêm só
      // para a tela poder dizer isso, em vez de deixar o buraco sem explicação.
      supabase
        .from("pedidos")
        .select("id, data_entrega, valor_cobrado, valor_calculado, preco_corrigido, valor_brinde, tipo, nome_cliente, created_at, clientes(nome)")
        .eq("status", "cancelado")
        .gte("data_entrega", periodo.inicio)
        .lte("data_entrega", periodo.fim)
        .order("data_entrega", { ascending: false }),

      supabase
        .from("custos")
        .select("*, categorias_custo(nome)")
        .gte("data", periodo.inicio)
        .lte("data", periodo.fim)
        .order("data", { ascending: false }),

      supabase
        .from("categorias_custo")
        .select("*")
        .order("nome"),

      // `pedidos(status)` traz o status do pedido dono da ficha: sem ele não dá
      // para separar o topper de um pedido cancelado dos demais. A busca não
      // filtra por período — ver o bloco de toppers mais abaixo.
      supabase
        .from("toppers_pedido")
        .select("valor, frete, pago_fornecedor, data_pagamento, pedidos(status)"),
    ]);

  const entregues = (entreguesResult.data ?? []) as unknown as PedidoComCliente[];
  const feitos = (feitosResult.data ?? []) as unknown as PedidoComCliente[];
  const cancelados = (canceladosResult.data ?? []) as unknown as PedidoComCliente[];
  const custos = (custosResult.data ?? []) as unknown as CustoComCategoria[];
  const categorias = (categoriasResult.data ?? []) as CategoriaCusto[];
  const toppers = (toppersResult.data ?? []) as unknown as TopperFinanceiro[];

  const semConexao = houveErroDeConexao(
    entreguesResult,
    feitosResult,
    canceladosResult,
    custosResult,
    categoriasResult,
    toppersResult
  );

  // ── Receita e ticket médio ────────────────────────────────────────────────
  // Só o que está com status "entregue" entra aqui; cancelado e a fazer ficam de fora.
  const receitaPeriodo = somar(entregues.map((p) => p.valor_cobrado ?? 0));
  const entreguesComValor = entregues.filter((p) => valorDaEntrega(p) != null);
  const semValor = entregues.length - entreguesComValor.length;
  // Divide pelas entregas que têm valor: incluir as sem valor no divisor puxava
  // o ticket para baixo e fazia parecer que a média de venda tinha caído.
  const ticketMedio =
    entreguesComValor.length > 0 ? receitaPeriodo / entreguesComValor.length : null;

  const aReceber = somar(feitos.map((p) => calcularValorFinal(p) ?? 0));
  const feitosSemValor = feitos.filter((p) => calcularValorFinal(p) == null).length;

  const totalCustosLancados = somar(custos.map((c) => c.valor));

  // ── Toppers ───────────────────────────────────────────────────────────────
  // "A pagar" é dívida em aberto com o fornecedor. Pedido cancelado não tem
  // topper a solicitar, receber ou pagar — ele já sai da tela de Toppers por
  // isso, e cobrá-lo aqui mostraria uma dívida que nem dá para quitar por lá.
  const aPagar = toppers.filter(
    (t) => !t.pago_fornecedor && !pedidoCancelado(t) && custoDoTopper(t) > 0
  );
  const totalToppersAPagar = somar(aPagar.map(custoDoTopper));
  const toppersAPagarCancelados = somar(
    toppers
      .filter((t) => !t.pago_fornecedor && pedidoCancelado(t) && custoDoTopper(t) > 0)
      .map(custoDoTopper)
  );

  // Já pago continua sendo custo mesmo se o pedido caiu depois: o dinheiro saiu.
  const pagosNoPeriodo = toppers.filter(
    (t) =>
      t.pago_fornecedor &&
      t.data_pagamento &&
      t.data_pagamento >= periodo.inicio &&
      t.data_pagamento <= periodo.fim
  );
  const totalToppersPagosPeriodo = somar(pagosNoPeriodo.map(custoDoTopper));
  const toppersPagosCancelados = somar(
    pagosNoPeriodo.filter(pedidoCancelado).map(custoDoTopper)
  );
  const mostrarToppers =
    totalToppersAPagar > 0 || totalToppersPagosPeriodo > 0 || toppersAPagarCancelados > 0;

  // ── Custos, lucro e margem ────────────────────────────────────────────────
  const totalCustosPeriodo = totalCustosLancados + totalToppersPagosPeriodo;
  const lucroEstimado = receitaPeriodo - totalCustosPeriodo;
  // Margem com receita > 0: exigir custo lançado escondia a margem justo no
  // período em que nada foi gasto, que é quando ela é melhor.
  const margemPct = receitaPeriodo > 0 ? Math.round((lucroEstimado / receitaPeriodo) * 100) : null;

  const valorPerdidoCancelados = somar(
    cancelados.map((p) => valorDaEntrega(p) ?? calcularValorFinal(p) ?? 0)
  );

  // ── Histórico mensal adaptado ao período selecionado ──────────────────────
  const meses = getMesesNoPeriodo(periodo.inicio, periodo.fim);
  const mesAtualChave = format(new Date(), "yyyy-MM");

  const mesesResumo = meses.map((mes) => {
    const pedidosMes = entregues.filter((p) => p.data_entrega.startsWith(mes.chave));
    const receita = somar(pedidosMes.map((p) => p.valor_cobrado ?? 0));
    return { ...mes, receita, quantidade: pedidosMes.length };
  });
  const maxReceita = Math.max(...mesesResumo.map((m) => m.receita), 1);

  const linhasFeitos = feitos.map((p) => linhaDoPedido(p, calcularValorFinal(p), "definir valor"));
  const linhasEntregues = entregues.map((p) =>
    linhaDoPedido(p, valorDaEntrega(p), "sem valor")
  );
  const linhasCancelados = cancelados.map((p) =>
    linhaDoPedido(p, valorDaEntrega(p) ?? calcularValorFinal(p), "sem valor")
  );

  return (
    <div className="py-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-400 mt-0.5">{periodo.label}</p>
      </div>

      {semConexao && <AvisoConexao detalhe="Os valores abaixo podem estar incompletos." />}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <TrendingUp size={12} className="text-emerald-500" />
            Receita do Período
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(receitaPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {entregues.length} pedido{entregues.length !== 1 ? "s" : ""} entregue{entregues.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <TrendingDown size={12} className="text-rose-500" />
            Custos do Período
          </div>
          <p className="text-xl font-bold text-rose-600">{formatCurrency(totalCustosPeriodo)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {custos.length} lançamento{custos.length !== 1 ? "s" : ""}
            {totalToppersPagosPeriodo > 0 && ` + ${formatCurrency(totalToppersPagosPeriodo)} em toppers`}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <Tag size={12} className={lucroEstimado >= 0 ? "text-emerald-500" : "text-red-500"} />
            Lucro Estimado
          </div>
          <p className={`text-xl font-bold ${lucroEstimado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(lucroEstimado)}
          </p>
          {margemPct !== null ? (
            <p className="text-xs text-gray-400 mt-0.5">margem {margemPct}%</p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">receita − custos</p>
          )}
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <Banknote size={12} className="text-gray-400" />
            Ticket Médio
          </div>
          <p className="text-xl font-bold text-gray-700">
            {ticketMedio != null ? formatCurrency(ticketMedio) : <span className="text-gray-300">—</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {ticketMedio != null
              ? `${entreguesComValor.length} entrega${entreguesComValor.length !== 1 ? "s" : ""} com valor`
              : "nenhuma entrega com valor"}
          </p>
        </div>
      </div>

      {/* Lançamentos de Custos */}
      <CustosSection custos={custos} categorias={categorias} periodo={periodo} />

      {/* Pedidos entregues que ficaram sem valor: receita que existiu e não foi contada */}
      {semValor > 0 && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <AlertCircle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700">
            <span className="font-semibold">
              {semValor} entrega{semValor > 1 ? "s" : ""} sem valor registrado
            </span>{" "}
            — a receita e o ticket médio acima estão menores do que o real. Abra
            {semValor > 1 ? " os pedidos marcados com " : " o pedido marcado com "}
            <AlertCircle size={11} className="inline -mt-0.5 text-orange-500" /> em Entregas e informe o valor cobrado.
          </p>
        </div>
      )}

      {/* A Receber e Entregas do Período */}
      {(feitos.length > 0 || entregues.length > 0) && (
        <div className="card p-4 space-y-4">
          {feitos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-sm text-gray-700">A Receber</h2>
                  {/* Sem esta linha a conta não fecha: soma-se "a receber" à receita
                      do período e o total não bate com nada que a tela mostra. */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tudo que está pronto e ainda não foi entregue — não depende do período
                    {feitosSemValor > 0 && ` · ${feitosSemValor} sem valor`}
                  </p>
                </div>
                <span className="text-sm font-bold text-blue-600 flex-shrink-0">{formatCurrency(aReceber)}</span>
              </div>
              <ListaFinanceira linhas={linhasFeitos} corValor="text-blue-600" />
            </div>
          )}

          {feitos.length > 0 && entregues.length > 0 && <hr className="border-gray-100" />}

          {entregues.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-sm text-gray-700">Entregas</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{periodo.label}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600 flex-shrink-0">
                  {formatCurrency(receitaPeriodo)}
                </span>
              </div>
              <ListaFinanceira linhas={linhasEntregues} corValor="text-emerald-600" mostrarSinal />
            </div>
          )}
        </div>
      )}

      {/* Cancelados do período — o que a tela deixou de fora, à vista */}
      {cancelados.length > 0 && (
        <CanceladosSection
          linhas={linhasCancelados}
          valorPerdido={valorPerdidoCancelados}
          periodoLabel={periodo.label}
        />
      )}

      {/* Toppers */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-700">Custos com Toppers</h2>
          <Link
            href="/toppers"
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            Gerenciar <ArrowRight size={12} />
          </Link>
        </div>
        {mostrarToppers ? (
          <div className="space-y-2">
            {totalToppersAPagar > 0 && (
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-sm text-gray-600">
                  A pagar fornecedores
                  <span className="block text-[11px] text-gray-400">
                    {aPagar.length} topper{aPagar.length !== 1 ? "s" : ""} de pedidos ativos
                  </span>
                </span>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(totalToppersAPagar)}</span>
              </div>
            )}
            {totalToppersPagosPeriodo > 0 && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Pago — {periodo.label}</span>
                <span className="text-sm font-semibold text-gray-500">{formatCurrency(totalToppersPagosPeriodo)}</span>
              </div>
            )}
            {(toppersAPagarCancelados > 0 || toppersPagosCancelados > 0) && (
              <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                {toppersAPagarCancelados > 0 &&
                  `${formatCurrency(toppersAPagarCancelados)} de pedidos cancelados ficaram de fora do que há a pagar.`}
                {toppersAPagarCancelados > 0 && toppersPagosCancelados > 0 && " "}
                {toppersPagosCancelados > 0 &&
                  `${formatCurrency(toppersPagosCancelados)} pagos no período são de pedidos cancelados depois — o dinheiro saiu, então continuam no custo.`}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Nenhum custo com toppers no período.</p>
        )}
      </div>

      {/* Histórico mensal adaptado ao período */}
      {mesesResumo.length > 0 && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700">
            {mesesResumo.length === 1 ? "Resumo do Período" : `Evolução — ${periodo.label}`}
          </h2>
          <div className="space-y-3">
            {mesesResumo.map((mes) => {
              const isMesAtual = mes.chave === mesAtualChave;
              const barWidth = mes.receita > 0 ? Math.round((mes.receita / maxReceita) * 100) : 0;
              return (
                <div key={mes.chave} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isMesAtual ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                      {mes.label}
                      {isMesAtual && (
                        <span className="ml-1.5 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">
                          atual
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{mes.quantidade} ped.</span>
                      <span className={`text-sm font-bold ${isMesAtual ? "text-emerald-600" : "text-gray-600"}`}>
                        {mes.receita > 0 ? formatCurrency(mes.receita) : <span className="text-gray-300">—</span>}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isMesAtual ? "bg-emerald-400" : "bg-gray-300"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {entregues.length === 0 && feitos.length === 0 && (
        <div className="card p-8 text-center space-y-2">
          <span className="text-3xl block">📊</span>
          <p className="text-sm text-gray-400">
            Nenhum dado financeiro para o período selecionado.
          </p>
        </div>
      )}
    </div>
  );
}
