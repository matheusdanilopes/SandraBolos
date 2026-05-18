"use client";

import Link from "next/link";
import { useState } from "react";
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDate, isEntregaHoje, pedidoAlerta, formatCurrency, calcularValorFinal, pedidoNumero } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import {
  TIPO_LABELS,
  STATUS_LABELS,
  type PedidoComCliente,
  type StatusPedido,
} from "@/types/database";
import {
  Package,
  Loader,
  CheckCircle,
  AlertTriangle,
  X,
  TrendingUp,
  Banknote,
  FileEdit,
  ChevronRight,
} from "lucide-react";

type Filtro = "todos" | "hoje" | "produzindo" | "feito" | "atrasados";

const FILTRO_LABELS: Record<Filtro, string> = {
  todos: "Todos os Pedidos Ativos",
  hoje: "Entregas de Hoje",
  produzindo: "Em Produção",
  feito: "Prontos para Entregar",
  atrasados: "Atrasados",
};

const STATUS_ORDER: StatusPedido[] = ["novo", "produzindo", "feito", "entregue"];

const STATUS_DOT: Record<StatusPedido, string> = {
  rascunho: "bg-amber-400",
  novo: "bg-blue-400",
  produzindo: "bg-yellow-400",
  feito: "bg-green-400",
  entregue: "bg-gray-300",
  cancelado: "bg-red-300",
};

interface Props {
  pedidos: PedidoComCliente[];
  receitaPeriodo: number;
  periodoLabel: string;
  aReceber: number;
}

function getDayLabel(dateStr: string): { label: string; variant: "atrasado" | "hoje" | "amanha" | "normal" } {
  const date = parseISO(dateStr);
  if (isPast(date) && !isToday(date)) return { label: `Atrasado — ${format(date, "dd/MM", { locale: ptBR })}`, variant: "atrasado" };
  if (isToday(date)) return { label: `Hoje — ${format(date, "dd/MM", { locale: ptBR })}`, variant: "hoje" };
  if (isTomorrow(date)) return { label: `Amanhã — ${format(date, "dd/MM", { locale: ptBR })}`, variant: "amanha" };
  return { label: format(date, "EEEE, dd/MM", { locale: ptBR }), variant: "normal" };
}

const DAY_VARIANT_CLASSES = {
  atrasado: "text-red-700 bg-red-50 border border-red-200",
  hoje: "text-brand-700 bg-brand-50 border border-brand-200",
  amanha: "text-orange-700 bg-orange-50 border border-orange-200",
  normal: "text-gray-600 bg-gray-100 border border-gray-200",
};

export function DashboardClient({ pedidos, receitaPeriodo, periodoLabel, aReceber }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const rascunhos = pedidos.filter((p) => p.status === "rascunho");
  const pedidosAtivos = pedidos.filter((p) => p.status !== "rascunho");

  const grupos = {
    hoje: pedidosAtivos.filter((p) => isEntregaHoje(p.data_entrega)),
    produzindo: pedidosAtivos.filter((p) => p.status === "produzindo"),
    feito: pedidosAtivos.filter((p) => p.status === "feito"),
    atrasados: pedidosAtivos.filter(
      (p) =>
        pedidoAlerta(p.data_entrega, p.hora_entrega, p.hora_retirada) === "atrasado" &&
        p.status !== "entregue"
    ),
  };

  const filtrados =
    filtro === "hoje" ? grupos.hoje
    : filtro === "produzindo" ? grupos.produzindo
    : filtro === "feito" ? grupos.feito
    : filtro === "atrasados" ? grupos.atrasados
    : pedidosAtivos;

  const porDia = filtrados.reduce((acc, p) => {
    const dia = p.data_entrega;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(p);
    return acc;
  }, {} as Record<string, PedidoComCliente[]>);

  const diasOrdenados = Object.keys(porDia).sort();

  const isFiltroStatus = filtro === "produzindo" || filtro === "feito";

  function toggleFiltro(f: Filtro) {
    setFiltro((prev) => (prev === f ? "todos" : f));
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => toggleFiltro("hoje")}
          className={`card p-4 text-left transition-all active:scale-95 ${
            filtro === "hoje" ? "ring-2 ring-brand-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-brand-50 rounded-lg">
              <Package size={16} className="text-brand-600" />
            </div>
            {filtro === "hoje" && <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">ativo</span>}
          </div>
          <div className="text-2xl font-bold text-brand-600 leading-none">{grupos.hoje.length}</div>
          <div className="text-xs text-gray-500 mt-1">Entregas Hoje</div>
        </button>

        <button
          onClick={() => toggleFiltro("produzindo")}
          className={`card p-4 text-left transition-all active:scale-95 ${
            filtro === "produzindo" ? "ring-2 ring-yellow-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-yellow-50 rounded-lg">
              <Loader size={16} className="text-yellow-600" />
            </div>
            {filtro === "produzindo" && <span className="text-[10px] font-medium text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded-full">ativo</span>}
          </div>
          <div className="text-2xl font-bold text-yellow-600 leading-none">{grupos.produzindo.length}</div>
          <div className="text-xs text-gray-500 mt-1">Produzindo</div>
        </button>

        <button
          onClick={() => toggleFiltro("feito")}
          className={`card p-4 text-left transition-all active:scale-95 ${
            filtro === "feito" ? "ring-2 ring-green-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-green-50 rounded-lg">
              <CheckCircle size={16} className="text-green-600" />
            </div>
            {filtro === "feito" && <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">ativo</span>}
          </div>
          <div className="text-2xl font-bold text-green-600 leading-none">{grupos.feito.length}</div>
          <div className="text-xs text-gray-500 mt-1">Prontos</div>
        </button>

        <button
          onClick={() => toggleFiltro("atrasados")}
          className={`card p-4 text-left transition-all active:scale-95 ${
            filtro === "atrasados" ? "ring-2 ring-red-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-red-50 rounded-lg">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            {grupos.atrasados.length > 0 && filtro !== "atrasados" && (
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">{grupos.atrasados.length}</span>
            )}
            {filtro === "atrasados" && <span className="text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">ativo</span>}
          </div>
          <div className="text-2xl font-bold text-red-600 leading-none">{grupos.atrasados.length}</div>
          <div className="text-xs text-gray-500 mt-1">Atrasados</div>
        </button>
      </div>

      {/* Indicador de rascunhos */}
      {rascunhos.length > 0 && (
        <Link
          href="/pedidos"
          className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 active:bg-amber-200 transition-colors"
        >
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileEdit size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {rascunhos.length} rascunho{rascunhos.length !== 1 ? "s" : ""} incompleto{rascunhos.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Toque para ver e completar</p>
          </div>
          <ChevronRight size={16} className="text-amber-400 flex-shrink-0" />
        </Link>
      )}

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <div className="p-1 bg-emerald-50 rounded-md">
              <TrendingUp size={12} className="text-emerald-600" />
            </div>
            <span className="capitalize truncate">{periodoLabel}</span>
          </div>
          <div className="text-lg font-bold text-emerald-600 leading-tight">
            {formatCurrency(receitaPeriodo)}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <div className="p-1 bg-blue-50 rounded-md">
              <Banknote size={12} className="text-blue-600" />
            </div>
            A Receber
          </div>
          <div className="text-lg font-bold text-blue-600 leading-tight">
            {aReceber > 0 ? formatCurrency(aReceber) : <span className="text-gray-400 font-normal text-sm">Nenhum pendente</span>}
          </div>
        </div>
      </div>

      {/* Lista filtrada */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">
            {FILTRO_LABELS[filtro]}
            <span className="text-gray-400 font-normal ml-1.5">({filtrados.length})</span>
          </h2>
          {filtro !== "todos" && (
            <button
              onClick={() => setFiltro("todos")}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        {filtrados.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <span className="text-4xl block">🎂</span>
            <p className="text-sm text-gray-400">
              {filtro === "todos"
                ? "Nenhum pedido ativo no momento"
                : `Nenhum pedido em "${FILTRO_LABELS[filtro].toLowerCase()}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {diasOrdenados.map((dia) => {
              const { label, variant } = getDayLabel(dia);
              const pedidosDoDia = porDia[dia];

              const mostrarSubgrupos = !isFiltroStatus;

              if (mostrarSubgrupos) {
                const porStatus = STATUS_ORDER.reduce((acc, s) => {
                  const grupo = pedidosDoDia.filter((p) => p.status === s);
                  if (grupo.length > 0) acc[s] = grupo;
                  return acc;
                }, {} as Partial<Record<StatusPedido, PedidoComCliente[]>>);

                return (
                  <div key={dia}>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 capitalize ${DAY_VARIANT_CLASSES[variant]}`}>
                      {variant === "atrasado" && <AlertTriangle size={10} />}
                      {label}
                    </div>
                    <div className="space-y-4">
                      {(Object.entries(porStatus) as [StatusPedido, PedidoComCliente[]][]).map(([status, lista]) => (
                        <div key={status}>
                          <div className="flex items-center gap-1.5 mb-2 px-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                            <span className="text-xs font-medium text-gray-500">
                              {STATUS_LABELS[status]} ({lista.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {lista.map((pedido) => (
                              <PedidoCard key={pedido.id} pedido={pedido} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={dia}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 capitalize ${DAY_VARIANT_CLASSES[variant]}`}>
                    {variant === "atrasado" && <AlertTriangle size={10} />}
                    {label}
                  </div>
                  <div className="space-y-2">
                    {pedidosDoDia.map((pedido) => (
                      <PedidoCard key={pedido.id} pedido={pedido} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: PedidoComCliente }) {
  const valor = calcularValorFinal(pedido);
  const numero = pedidoNumero(pedido.created_at, pedido.id);

  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      className="card p-3.5 block hover:shadow-md transition-shadow active:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-semibold text-sm text-gray-900 truncate">
              {pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente"}
            </span>
            <StatusBadge status={pedido.status} />
            <AlertaBadge
              dataEntrega={pedido.data_entrega}
              status={pedido.status}
              horaEntrega={pedido.hora_entrega}
              horaRetirada={pedido.hora_retirada}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{TIPO_LABELS[pedido.tipo]}</span>
            {pedido.peso && (
              <span className="text-xs text-gray-400">{pedido.peso} kg</span>
            )}
            {pedido.quantidade && (
              <span className="text-xs text-gray-400">{pedido.quantidade} un.</span>
            )}
            <span className="text-gray-300">·</span>
            <span className="text-[10px] text-gray-400 font-mono">{numero}</span>
          </div>
        </div>
        {valor != null && (
          <span className="text-sm font-semibold text-emerald-600 flex-shrink-0">
            {formatCurrency(valor)}
          </span>
        )}
      </div>
    </Link>
  );
}
