import { supabase } from "@/lib/supabase";
import { formatCurrency, calcularValorFinal, formatDate } from "@/lib/utils";
import { format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TIPO_LABELS, type PedidoComCliente, type CustoComCategoria, type CategoriaCusto } from "@/types/database";
import { TrendingUp, Banknote, AlertCircle, CheckCircle, TrendingDown, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CustosSection } from "./CustosSection";

export const dynamic = "force-dynamic";

interface MesResumo {
  label: string;
  chave: string;
  receita: number;
  quantidade: number;
}

export default async function FinanceiroPage() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje).toISOString().split("T")[0];
  const mesCurrent = format(hoje, "yyyy-MM");
  const seisAtras = subMonths(startOfMonth(hoje), 5).toISOString().split("T")[0];

  const [entreguesResult, feitosResult, custosResult, categoriasResult, toppersResult] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("data_entrega, valor_cobrado, valor_calculado, preco_corrigido, tipo, id, created_at, clientes(nome)")
        .eq("status", "entregue")
        .gte("data_entrega", seisAtras)
        .order("data_entrega", { ascending: false }),

      supabase
        .from("pedidos")
        .select("id, data_entrega, valor_calculado, preco_corrigido, tipo, created_at, clientes(nome)")
        .eq("status", "feito")
        .order("data_entrega", { ascending: true }),

      supabase
        .from("custos")
        .select("*, categorias_custo(nome)")
        .gte("data", inicioMes)
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

  // Receita e ticket do mês atual
  const doMes = entregues.filter((p) => p.data_entrega >= inicioMes);
  const receitaMes = doMes.reduce((acc, p) => acc + (p.valor_cobrado ?? 0), 0);
  const ticketMedio = doMes.length > 0 ? receitaMes / doMes.length : null;
  const semValorMes = doMes.filter((p) => !p.valor_cobrado).length;

  // A receber
  const aReceber = feitos.reduce(
    (acc, p) => acc + (p.preco_corrigido ?? p.valor_calculado ?? 0),
    0
  );

  // Custos manuais do mês
  const totalCustosMes = custos.reduce((acc, c) => acc + c.valor, 0);
  const lucroEstimado = receitaMes - totalCustosMes;

  // Toppers
  const totalToppersAPagar = toppers
    .filter((t) => !t.pago_fornecedor && (t.valor + t.frete) > 0)
    .reduce((acc, t) => acc + t.valor + t.frete, 0);
  const totalToppersPagosMes = toppers
    .filter((t) => t.pago_fornecedor && t.data_pagamento?.startsWith(mesCurrent))
    .reduce((acc, t) => acc + t.valor + t.frete, 0);
  const mostrarToppers = totalToppersAPagar > 0 || totalToppersPagosMes > 0;

  // Resumo por mês (últimos 6)
  const mesesResumo: MesResumo[] = [];
  for (let i = 0; i <= 5; i++) {
    const inicio = startOfMonth(subMonths(hoje, i));
    const chave = format(inicio, "yyyy-MM");
    const label = format(inicio, "MMMM yyyy", { locale: ptBR });
    const pedidosMes = entregues.filter((p) => p.data_entrega.startsWith(chave));
    const receita = pedidosMes.reduce((acc, p) => acc + (p.valor_cobrado ?? 0), 0);
    mesesResumo.push({ label, chave, receita, quantidade: pedidosMes.length });
  }
  const maxReceita = Math.max(...mesesResumo.map((m) => m.receita), 1);

  return (
    <div className="py-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Financeiro</h1>

      {/* Cards 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <TrendingUp size={12} className="text-emerald-500" />
            Receita do Mês
          </div>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(receitaMes)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{doMes.length} pedidos entregues</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <TrendingDown size={12} className="text-rose-500" />
            Custos do Mês
          </div>
          <p className="text-xl font-bold text-rose-600">{formatCurrency(totalCustosMes)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{custos.length} lançamento{custos.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <Tag size={12} className={lucroEstimado >= 0 ? "text-blue-500" : "text-red-500"} />
            Lucro Estimado
          </div>
          <p className={`text-xl font-bold ${lucroEstimado >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {formatCurrency(lucroEstimado)}
          </p>
          {totalCustosMes === 0 ? (
            <p className="text-xs text-gray-400 mt-0.5">Adicione custos para ver</p>
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
          <p className="text-xs text-gray-400 mt-0.5 capitalize">
            {format(hoje, "MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* A receber */}
      {feitos.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-700">A Receber</h2>
            <span className="text-sm font-bold text-blue-600">{formatCurrency(aReceber)}</span>
          </div>
          <div className="space-y-2">
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

      {/* Aviso pedidos sem valor no mês */}
      {semValorMes > 0 && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
          <AlertCircle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-700">
            {semValorMes} pedido{semValorMes > 1 ? "s" : ""} entregue{semValorMes > 1 ? "s" : ""} este mês sem valor registrado.
          </p>
        </div>
      )}

      {/* Toppers — resumo compacto */}
      {mostrarToppers && (
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
          <div className="space-y-2">
            {totalToppersAPagar > 0 && (
              <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-sm text-gray-600">A pagar fornecedores</span>
                <span className="text-sm font-semibold text-red-600">{formatCurrency(totalToppersAPagar)}</span>
              </div>
            )}
            {totalToppersPagosMes > 0 && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Pago este mês</span>
                <span className="text-sm font-semibold text-gray-500">{formatCurrency(totalToppersPagosMes)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custos do Mês */}
      <CustosSection custos={custos} categorias={categorias} />

      {/* Histórico mensal */}
      <div className="card p-4 space-y-4">
        <h2 className="font-semibold text-sm text-gray-700">Últimos 6 Meses</h2>
        <div className="space-y-3">
          {mesesResumo.map((mes, i) => {
            const isMesAtual = i === 0;
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
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isMesAtual ? "bg-emerald-400" : "bg-gray-300"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entregas do mês */}
      {doMes.length > 0 && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">Entregas do Mês</h2>
          <div className="space-y-2">
            {doMes.map((p) => (
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

      {entregues.length === 0 && feitos.length === 0 && (
        <div className="card p-8 text-center space-y-2">
          <span className="text-3xl block">📊</span>
          <p className="text-sm text-gray-400">
            Nenhum dado financeiro ainda. Conclua e registre o valor dos seus pedidos!
          </p>
        </div>
      )}
    </div>
  );
}
