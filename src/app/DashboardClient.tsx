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
  Plus,
  TrendingUp,
  Banknote,
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
  novo: "bg-blue-400",
  produzindo: "bg-yellow-400",
  feito: "bg-green-400",
  entregue: "bg-gray-300",
};

interface Props {
  pedidos: PedidoComCliente[];
  receitaMes: number;
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

export function DashboardClient({ pedidos, receitaMes, aReceber }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const grupos = {
    hoje: pedidos.filter((p) => isEntregaHoje(p.data_entrega)),
    produzindo: pedidos.filter((p) => p.status === "produzindo"),
    feito: pedidos.filter((p) => p.status === "feito"),
    atrasados: pedidos.filter(
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
    : pedidos;

  // Group by delivery date
  const porDia = filtrados.reduce((acc, p) => {
    const dia = p.data_entrega;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(p);
    return acc;
  }, {} as Record<string, PedidoComCliente[]>);

  const diasOrdenados = Object.keys(porDia).sort();

  // Within each day, group by status in workflow order
  const isFiltroStatus = filtro === "produzindo" || filtro === "feito";

  function toggleFiltro(f: Filtro) {
    setFiltro((prev) => (prev === f ? "todos" : f));
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => toggleFiltro("hoje")}
          className={`card p-3 text-left transition-all active:scale-95 ${
            filtro === "hoje" ? "ring-2 ring-brand-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="text-2xl font-bold text-brand-600">{grupos.hoje.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Package size={11} /> Entregas Hoje
          </div>
        </button>

        <button
          onClick={() => toggleFiltro("produzindo")}
          className={`card p-3 text-left transition-all active:scale-95 ${
            filtro === "produzindo" ? "ring-2 ring-yellow-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="text-2xl font-bold text-yellow-600">{grupos.produzindo.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Loader size={11} /> Produzindo
          </div>
        </button>

        <button
          onClick={() => toggleFiltro("feito")}
          className={`card p-3 text-left transition-all active:scale-95 ${
            filtro === "feito" ? "ring-2 ring-green-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="text-2xl font-bold text-green-600">{grupos.feito.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <CheckCircle size={11} /> Prontos
          </div>
        </button>

        <button
          onClick={() => toggleFiltro("atrasados")}
          className={`card p-3 text-left transition-all active:scale-95 ${
            filtro === "atrasados" ? "ring-2 ring-red-400 shadow-md" : "hover:shadow-md"
          }`}
        >
          <div className="text-2xl font-bold text-red-600">{grupos.atrasados.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <AlertTriangle size={11} /> Atrasados
          </div>
        </button>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <TrendingUp size={11} className="text-emerald-500" />
            Receita do Mês
          </div>
          <div className="text-base font-bold text-emerald-600 leading-tight">
            {formatCurrency(receitaMes)}
          </div>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Banknote size={11} className="text-blue-500" />
            A Receber
          </div>
          <div className="text-base font-bold text-blue-600 leading-tight">
            {aReceber > 0 ? formatCurrency(aReceber) : <span className="text-gray-400">—</span>}
          </div>
        </div>
      </div>

      {/* Filtered list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700">
            {FILTRO_LABELS[filtro]}
            <span className="text-gray-400 font-normal ml-1">({filtrados.length})</span>
          </h2>
          {filtro !== "todos" && (
            <button
              onClick={() => setFiltro("todos")}
              className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600"
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
            {filtro === "todos" && (
              <Link
                href="/pedidos/novo"
                className="btn-primary inline-flex items-center gap-1 text-sm"
              >
                <Plus size={14} /> Criar Pedido
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {diasOrdenados.map((dia) => {
              const { label, variant } = getDayLabel(dia);
              const pedidosDoDia = porDia[dia];

              // Sub-group by status when showing "todos" or "hoje"/"atrasados"
              const mostrarSubgrupos = !isFiltroStatus;

              if (mostrarSubgrupos) {
                const porStatus = STATUS_ORDER.reduce((acc, s) => {
                  const grupo = pedidosDoDia.filter((p) => p.status === s);
                  if (grupo.length > 0) acc[s] = grupo;
                  return acc;
                }, {} as Partial<Record<StatusPedido, PedidoComCliente[]>>);

                return (
                  <div key={dia}>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 capitalize ${DAY_VARIANT_CLASSES[variant]}`}>
                      {variant === "atrasado" && <AlertTriangle size={10} />}
                      {label}
                    </div>
                    <div className="space-y-3">
                      {(Object.entries(porStatus) as [StatusPedido, PedidoComCliente[]][]).map(([status, lista]) => (
                        <div key={status}>
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                            <span className="text-xs font-medium text-gray-500">
                              {STATUS_LABELS[status]} ({lista.length})
                            </span>
                          </div>
                          <div className="space-y-1.5">
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
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 capitalize ${DAY_VARIANT_CLASSES[variant]}`}>
                    {variant === "atrasado" && <AlertTriangle size={10} />}
                    {label}
                  </div>
                  <div className="space-y-1.5">
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
      className="card p-3 block hover:shadow-md transition-shadow active:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 truncate">
              {pedido.clientes?.nome ?? "Sem cliente"}
            </span>
            <AlertaBadge
              dataEntrega={pedido.data_entrega}
              status={pedido.status}
              horaEntrega={pedido.hora_entrega}
              horaRetirada={pedido.hora_retirada}
            />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">{TIPO_LABELS[pedido.tipo]}</span>
            {pedido.peso && (
              <span className="text-xs text-gray-400">{pedido.peso} kg</span>
            )}
            {pedido.quantidade && (
              <span className="text-xs text-gray-400">{pedido.quantidade} un.</span>
            )}
            <span className="text-gray-300">·</span>
            <span className="text-[10px] text-gray-400">{numero}</span>
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
