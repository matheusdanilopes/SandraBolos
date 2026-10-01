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
import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { LinhaFinanceira } from "./ListaFinanceira";
import { PainelMovimentacoes, type Aba } from "./PainelMovimentacoes";
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
        .select("data_entrega, valor_cobrado, valor_calculado, preco_corrigido, valor_brinde, topper, toppers_pedido(valor), tipo, id, nome_cliente, created_at, clientes(nome)")
        .eq("status", "entregue")
        .gte("data_entrega", periodo.inicio)
        .lte("data_entrega", periodo.fim)
        .order("data_entrega", { ascending: false }),

      supabase
        .from("pedidos")
        .select("id, data_entrega, valor_calculado, preco_corrigido, valor_brinde, topper, toppers_pedido(valor), tipo, nome_cliente, created_at, clientes(nome)")
        .eq("status", "feito")
        .order("data_entrega", { ascending: true }),

      // Cancelados do período: não entram em nenhuma conta desta tela — vêm só
      // para a tela poder dizer isso, em vez de deixar o buraco sem explicação.
      supabase
        .from("pedidos")
        .select("id, data_entrega, valor_cobrado, valor_calculado, preco_corrigido, valor_brinde, topper, toppers_pedido(valor), tipo, nome_cliente, created_at, clientes(nome)")
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

  // ── Custos, lucro e margem ────────────────────────────────────────────────
  const totalCustosPeriodo = totalCustosLancados + totalToppersPagosPeriodo;
  const lucroEstimado = receitaPeriodo - totalCustosPeriodo;
  // Margem com receita > 0: exigir custo lançado escondia a margem justo no
  // período em que nada foi gasto, que é quando ela é melhor.
  const margemPct = receitaPeriodo > 0 ? Math.round((lucroEstimado / receitaPeriodo) * 100) : null;

  const valorPerdidoCancelados = somar(
    cancelados.map((p) => valorDaEntrega(p) ?? calcularValorFinal(p) ?? 0)
  );

  const notaToppers =
    [
      toppersAPagarCancelados > 0 &&
        `${formatCurrency(toppersAPagarCancelados)} de pedidos cancelados ficaram de fora do que há a pagar.`,
      toppersPagosCancelados > 0 &&
        `${formatCurrency(toppersPagosCancelados)} pagos no período são de pedidos cancelados depois — o dinheiro saiu, então continuam no custo.`,
    ]
      .filter(Boolean)
      .join(" ") || null;

  // ── Histórico mensal adaptado ao período selecionado ──────────────────────
  // Com um mês só, a "evolução" repetia o card de resultado; ela só aparece
  // quando há mais de um mês para comparar.
  const meses = getMesesNoPeriodo(periodo.inicio, periodo.fim);
  const mesAtualChave = format(new Date(), "yyyy-MM");

  const mesesResumo = meses.map((mes) => {
    const pedidosMes = entregues.filter((p) => p.data_entrega.startsWith(mes.chave));
    const receita = somar(pedidosMes.map((p) => p.valor_cobrado ?? 0));
    const custo =
      somar(custos.filter((c) => c.data.startsWith(mes.chave)).map((c) => c.valor)) +
      somar(
        pagosNoPeriodo.filter((t) => t.data_pagamento!.startsWith(mes.chave)).map(custoDoTopper)
      );
    return { ...mes, receita, custo, lucro: receita - custo, quantidade: pedidosMes.length };
  });
  const maxReceita = Math.max(...mesesResumo.map((m) => m.receita), 1);

  const linhasFeitos = feitos.map((p) => linhaDoPedido(p, calcularValorFinal(p), "definir valor"));
  const linhasEntregues = entregues.map((p) =>
    linhaDoPedido(p, valorDaEntrega(p), "sem valor")
  );
  const linhasCancelados = cancelados.map((p) =>
    linhaDoPedido(p, valorDaEntrega(p) ?? calcularValorFinal(p), "sem valor")
  );

  const abaInicial: Aba =
    entregues.length > 0 ? "entregas" : feitos.length > 0 ? "receber" : "custos";

  // Fatia da receita consumida pelos custos — o resto da barra é o lucro.
  const fatiaCustos =
    receitaPeriodo > 0
      ? Math.min(100, Math.round((totalCustosPeriodo / receitaPeriodo) * 100))
      : totalCustosPeriodo > 0
        ? 100
        : 0;
  const fatiaLucro = receitaPeriodo > 0 ? 100 - fatiaCustos : 0;

  const detalheCustos = [
    `${custos.length} lançamento${custos.length !== 1 ? "s" : ""}`,
    totalToppersPagosPeriodo > 0 && `${formatCurrency(totalToppersPagosPeriodo)} em toppers`,
  ]
    .filter(Boolean)
    .join(" + ");

  return (
    <div className="py-4 space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-400 mt-0.5">{periodo.label}</p>
      </header>

      {semConexao && <AvisoConexao detalhe="Os valores abaixo podem estar incompletos." />}

      {/* Resultado: a conta inteira do período num lugar só — receita − custos = lucro. */}
      <section className="card p-4 space-y-4" aria-label="Resultado do período">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Wallet size={13} className="text-gray-400" />
              Lucro estimado
            </p>
            <p
              className={`text-3xl font-bold tracking-tight tabular-nums mt-1 ${
                lucroEstimado >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatCurrency(lucroEstimado)}
            </p>
          </div>
          {margemPct !== null && (
            <span
              className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                margemPct >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              margem {margemPct}%
            </span>
          )}
        </div>

        <div
          className="h-2 rounded-full bg-gray-100 flex overflow-hidden"
          role="img"
          aria-label={`Custos consomem ${fatiaCustos}% da receita`}
        >
          <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${fatiaCustos}%` }} />
          <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${fatiaLucro}%` }} />
        </div>

        <dl className="space-y-2.5">
          <LinhaResultado
            icone={<TrendingUp size={14} className="text-emerald-500" />}
            rotulo="Receita"
            detalhe={
              <>
                {entregues.length} entrega{entregues.length !== 1 ? "s" : ""}
                {semValor > 0 && <span className="text-orange-500"> · {semValor} sem valor</span>}
              </>
            }
            valor={formatCurrency(receitaPeriodo)}
            cor="text-emerald-600"
          />
          <LinhaResultado
            icone={<TrendingDown size={14} className="text-rose-500" />}
            rotulo="Custos"
            detalhe={detalheCustos}
            valor={`− ${formatCurrency(totalCustosPeriodo)}`}
            cor="text-rose-600"
          />
        </dl>

        <div className={`grid gap-2 pt-3 border-t border-gray-100 ${totalToppersAPagar > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
          <MiniIndicador
            rotulo="Ticket médio"
            valor={ticketMedio != null ? formatCurrency(ticketMedio) : "—"}
            detalhe={
              ticketMedio != null
                ? `${entreguesComValor.length} com valor`
                : "sem entregas com valor"
            }
          />
          <MiniIndicador
            rotulo="A receber"
            valor={formatCurrency(aReceber)}
            detalhe={`${feitos.length} pronto${feitos.length !== 1 ? "s" : ""}${
              feitosSemValor > 0 ? ` · ${feitosSemValor} sem valor` : ""
            }`}
            cor="text-blue-600"
          />
          {totalToppersAPagar > 0 && (
            <MiniIndicador
              rotulo="A pagar"
              valor={formatCurrency(totalToppersAPagar)}
              detalhe={`${aPagar.length} topper${aPagar.length !== 1 ? "s" : ""}`}
              cor="text-red-600"
              href="/toppers"
            />
          )}
        </div>
      </section>

      <PainelMovimentacoes
        abaInicial={abaInicial}
        periodo={periodo}
        entregas={{ linhas: linhasEntregues, total: receitaPeriodo }}
        aReceber={{ linhas: linhasFeitos, total: aReceber }}
        custos={{
          itens: custos,
          categorias,
          total: totalCustosPeriodo,
          toppers: {
            pagosPeriodo: totalToppersPagosPeriodo,
            aPagar: totalToppersAPagar,
            quantidadeAPagar: aPagar.length,
            nota: notaToppers,
          },
        }}
        cancelados={{ linhas: linhasCancelados, valorPerdido: valorPerdidoCancelados }}
      />

      {/* Evolução mês a mês — uma linha por mês, com a receita como barra de fundo. */}
      {mesesResumo.length > 1 && (
        <section className="card p-4 space-y-3" aria-label="Evolução mensal">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-sm text-gray-700">Mês a mês</h2>
            <span className="text-[11px] text-gray-400">receita do mês</span>
          </div>
          <ul className="space-y-1.5">
            {mesesResumo.map((mes) => {
              const isMesAtual = mes.chave === mesAtualChave;
              const barWidth = mes.receita > 0 ? Math.round((mes.receita / maxReceita) * 100) : 0;
              const vazio = mes.receita === 0 && mes.custo === 0;
              return (
                <li key={mes.chave} className="relative rounded-lg overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      isMesAtual ? "bg-emerald-100" : "bg-gray-100"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-2 px-2.5 py-1.5">
                    <span className="min-w-0">
                      <span className={`block text-xs ${isMesAtual ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                        {mes.label}
                      </span>
                      <span className="block text-[10px] text-gray-400">
                        {mes.quantidade} pedido{mes.quantidade !== 1 ? "s" : ""}
                      </span>
                    </span>
                    {vazio ? (
                      <span className="text-xs text-gray-300">—</span>
                    ) : (
                      <span className="text-right tabular-nums flex-shrink-0">
                        <span className="block text-sm font-semibold text-gray-800">{formatCurrency(mes.receita)}</span>
                        <span className={`block text-[10px] font-medium ${mes.lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          lucro {formatCurrency(mes.lucro)}
                        </span>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function LinhaResultado({
  icone,
  rotulo,
  detalhe,
  valor,
  cor,
}: {
  icone: ReactNode;
  rotulo: string;
  detalhe: ReactNode;
  valor: string;
  cor: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5">{icone}</span>
        <span className="min-w-0">
          <span className="block text-sm text-gray-700">{rotulo}</span>
          <span className="block text-[11px] text-gray-400">{detalhe}</span>
        </span>
      </dt>
      <dd className={`text-sm font-semibold tabular-nums flex-shrink-0 ${cor}`}>{valor}</dd>
    </div>
  );
}

function MiniIndicador({
  rotulo,
  valor,
  detalhe,
  cor = "text-gray-700",
  href,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  cor?: string;
  href?: string;
}) {
  const conteudo = (
    <>
      <p className="text-[11px] text-gray-500 flex items-center gap-0.5">
        {rotulo}
        {href && <ArrowRight size={10} className="text-gray-400" />}
      </p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${cor}`}>{valor}</p>
      <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{detalhe}</p>
    </>
  );
  const classe = "rounded-lg bg-gray-50 px-2.5 py-2 min-w-0";
  return href ? (
    <Link href={href} className={`${classe} hover:bg-gray-100 transition-colors duration-200`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
