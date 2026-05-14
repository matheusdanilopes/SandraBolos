import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { formatCurrency, calcularValorFinal, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TIPO_LABELS, type PedidoComCliente, type CustoComCategoria, type CategoriaCusto } from "@/types/database";
import { TrendingUp, Banknote, AlertCircle, CheckCircle, TrendingDown, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CustosSection } from "./CustosSection";
import { getPeriodoRange, getMesesNoPeriodo, isValidPreset } from "@/lib/periodo";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const cookieStore = cookies();
  const presetRaw = cookieStore.get("sb_periodo")?.value ?? "mes_atual";
  const preset = isValidPreset(presetRaw) ? presetRaw : "mes_atual";
  const de = cookieStore.get("sb_periodo_de")?.value;
  const ate = cookieStore.get("sb_periodo_ate")?.value;
  const periodo = getPeriodoRange(preset, de, ate);

  const [entreguesResult, feitosResult, custosResult, categoriasResult, toppersResult] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("data_entrega, valor_cobrado, valor_calculado, preco_corrigido, tipo, id, created_at, clientes(nome)")
        .eq("status", "entregue")
        .gte("data_entrega", periodo.inicio)
        .lte("data_entrega", periodo.fim)
        .order("data_entrega", { ascending: false }),

      supabase
        .from("pedidos")
        .select("id, data_entrega, valor_calculado, preco_corrigido, tipo, created_at, clientes(nome)")
        .eq("status", "feito")
        .order("data_entrega", { ascending: true }),

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

      supabase
        .from("toppers_pedido")
        .select("valor, frete, pago_fornecedor, data_pagamento"),
    ]);

  const entregues = (entreguesResult.data ?? []) as unknown as PedidoComCliente[];
  const feitos = (feitosResult.data ?? []) as unknown as PedidoComCliente[];
  const custos = (custosResult.data ?? []) as unknown as CustoComCategoria[];
  const categorias = (categoriasResult.data ?? []) as CategoriaCusto[];
  const toppers = toppersResult.data ?? [];

  // KPIs do período selecionado
  const receitaPeriodo = entregues.reduce((acc, p) => acc + (p.valor_cobrado ?? 0), 0);
  const ticketMedio = entregues.length > 0 ? receitaPeriodo / entregues.length : null;
  const semValor = entregues.filter((p) => !p.valor_cobrado).length;

  const aReceber = feitos.reduce(
    (acc, p) => acc + (p.preco_corrigido ?? p.valor_calculado ?? 0),
    0
  );

  const totalCustosLancados = custos.reduce((acc, c) => acc + c.valor, 0);

  // Toppers: a pagar (sem filtro de período — operacional) e pagos no período
  const totalToppersAPagar = toppers
    .filter((t) => !t.pago_fornecedor && t.valor + t.frete > 0)
    .reduce((acc, t) => acc + t.valor + t.frete, 0);
  const totalToppersPagosPeriodo = toppers
    .filter(
      (t) =>
        t.pago_fornecedor &&
        t.data_pagamento &&
        t.data_pagamento >= periodo.inicio &&
        t.data_pagamento <= periodo.fim
    )
    .reduce((acc, t) => acc + t.valor + t.frete, 0);
  const mostrarToppers = totalToppersAPagar > 0 || totalToppersPagosPeriodo > 0;

  const totalCustosPeriodo = totalCustosLancados + totalToppersPagosPeriodo;
  const lucroEstimado = receitaPeriodo - totalCustosPeriodo;
  const margemPct =
    receitaPeriodo > 0 && totalCustosPeriodo > 0
      ? Math.round((lucroEstimado / receitaPeriodo) * 100)
      : null;

  // Histórico mensal adaptado ao período selecionado
  const meses = getMesesNoPeriodo(periodo.inicio, periodo.fim);
  const mesAtualChave = format(new Date(), "yyyy-MM");

  const mesesResumo = meses.map((mes) => {
    const pedidosMes = entregues.filter((p) => p.data_entrega.startsWith(mes.chave));
    const receita = pedidosMes.reduce((acc, p) => acc + (p.valor_cobrado ?? 0), 0);
    return { ...mes, receita, quantidade: pedidosMes.length };
  });
  const maxReceita = Math.max(...mesesResumo.map((m) => m.receita), 1);

  return (
    <div className="py-4 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-400 capitalize mt-0.5">{periodo.label}</p>
      </div>

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
          {totalToppersPagosPeriodo > 0 ? (
            <p className="text-xs text-gray-400 mt-0.5">
              inclui {formatCurrency(totalToppersPagosPeriodo)} em toppers
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">
              {custos.length} lançamento{custos.length !== 1 ? "s" : ""}
            </p>
          )}
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
            {ticketMedio != null ? "por pedido" : "nenhuma entrega"}
          </p>
        </div>
      </div>

      {/* Lançamentos de Custos */}
      <CustosSection custos={custos} categorias={categorias} />

      {/* Aviso pedidos sem valor */}
      {semValor > 0 && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <AlertCircle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700">
            {semValor} pedido{semValor > 1 ? "s" : ""} entregue{semValor > 1 ? "s" : ""} no período sem valor registrado.
          </p>
        </div>
      )}

      {/* A Receber e Entregas do Período */}
      {(feitos.length > 0 || entregues.length > 0) && (
        <div className="card p-4 space-y-4">
          {feitos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm text-gray-700">A Receber</h2>
                <span className="text-sm font-bold text-blue-600">{formatCurrency(aReceber)}</span>
              </div>
              <div className="space-y-1">
                {feitos.map((p) => {
                  const valor = calcularValorFinal(p);
                  return (
                    <Link
                      key={p.id}
                      href={`/pedidos/${p.id}`}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {p.clientes?.nome ?? "Sem cliente"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {TIPO_LABELS[p.tipo]} · Entrega: {formatDate(p.data_entrega)}
                        </p>
                      </div>
                      {valor != null ? (
                        <span className="text-sm font-semibold text-blue-600">{formatCurrency(valor)}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">sem valor</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {feitos.length > 0 && entregues.length > 0 && <hr className="border-gray-100" />}

          {entregues.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-semibold text-sm text-gray-700 capitalize">
                Entregas — {periodo.label}
              </h2>
              <div className="space-y-1">
                {entregues.map((p) => (
                  <Link
                    key={p.id}
                    href={`/pedidos/${p.id}`}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {p.valor_cobrado ? (
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {p.clientes?.nome ?? "Sem cliente"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {TIPO_LABELS[p.tipo]} · {formatDate(p.data_entrega)}
                        </p>
                      </div>
                    </div>
                    {p.valor_cobrado ? (
                      <span className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(p.valor_cobrado)}
                      </span>
                    ) : (
                      <span className="text-xs text-orange-500 font-medium">sem valor</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
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
                <span className="text-sm text-gray-600">A pagar fornecedores</span>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(totalToppersAPagar)}</span>
              </div>
            )}
            {totalToppersPagosPeriodo > 0 && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600 capitalize">Pago — {periodo.label}</span>
                <span className="text-sm font-semibold text-gray-500">{formatCurrency(totalToppersPagosPeriodo)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Nenhum custo com toppers no período.</p>
        )}
      </div>

      {/* Histórico mensal adaptado ao período */}
      {mesesResumo.length > 0 && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-sm text-gray-700 capitalize">
            {mesesResumo.length === 1 ? "Resumo do Período" : `Evolução — ${periodo.label}`}
          </h2>
          <div className="space-y-3">
            {mesesResumo.map((mes) => {
              const isMesAtual = mes.chave === mesAtualChave;
              const barWidth = mes.receita > 0 ? Math.round((mes.receita / maxReceita) * 100) : 0;
              return (
                <div key={mes.chave} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs capitalize ${isMesAtual ? "font-semibold text-gray-800" : "text-gray-500"}`}>
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
