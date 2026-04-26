"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, ChevronRight, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { cn, formatDate, isEntregaHoje, isEntregaSemana, pedidoAlerta } from "@/lib/utils";
import { TIPO_LABELS, STATUS_LABELS, type PedidoComCliente, type StatusPedido } from "@/types/database";

type Filtro = "todos" | "hoje" | "semana" | "atrasados" | StatusPedido;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "atrasados", label: "Atrasados" },
  { value: "novo", label: STATUS_LABELS.novo },
  { value: "produzindo", label: STATUS_LABELS.produzindo },
  { value: "feito", label: STATUS_LABELS.feito },
  { value: "entregue", label: STATUS_LABELS.entregue },
];

function matchesFiltro(p: PedidoComCliente, filtro: Filtro): boolean {
  switch (filtro) {
    case "hoje": return isEntregaHoje(p.data_entrega);
    case "semana": return isEntregaSemana(p.data_entrega);
    case "atrasados":
      return (
        pedidoAlerta(p.data_entrega, p.hora_entrega, p.hora_retirada) === "atrasado" &&
        p.status !== "entregue"
      );
    case "todos": return true;
    default: return p.status === filtro;
  }
}

export function PedidosList({ pedidos }: { pedidos: PedidoComCliente[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<Filtro, number>> = {};
    for (const { value } of FILTROS) {
      counts[value] = pedidos.filter((p) => matchesFiltro(p, value)).length;
    }
    return counts;
  }, [pedidos]);

  const atrasadosCount = filterCounts["atrasados"] ?? 0;

  const filtered = pedidos.filter((p) => {
    const nome = p.clientes?.nome?.toLowerCase() ?? "";
    if (busca && !nome.includes(busca.toLowerCase())) return false;
    return matchesFiltro(p, filtro);
  });

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input pl-9 pr-9"
        />
        {busca && (
          <button
            onClick={() => setBusca("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTROS.map(({ value, label }) => {
          const count = filterCounts[value] ?? 0;
          const isActive = filtro === value;
          const isAtrasados = value === "atrasados";
          const hasUrgent = isAtrasados && atrasadosCount > 0;

          return (
            <button
              key={value}
              onClick={() => setFiltro(value)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
                isActive
                  ? hasUrgent
                    ? "bg-red-600 text-white"
                    : "bg-brand-600 text-white"
                  : hasUrgent
                  ? "bg-red-50 text-red-700 border border-red-200 hover:border-red-300"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              )}
            >
              {label}
              {value !== "todos" && count > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-bold rounded-full px-1 min-w-[16px] text-center leading-[16px]",
                    isActive
                      ? "bg-white/25 text-white"
                      : hasUrgent
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500">
        {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
        {filtro === "todos" && atrasadosCount > 0 && (
          <span className="text-red-600 font-medium ml-1">
            · {atrasadosCount} atrasado{atrasadosCount !== 1 ? "s" : ""}
          </span>
        )}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <span className="text-3xl block">🎂</span>
          <p className="text-sm text-gray-400">Nenhum pedido encontrado</p>
          {filtro === "todos" && !busca && (
            <Link href="/pedidos/novo" className="btn-primary inline-flex items-center gap-1.5 text-sm">
              + Novo pedido
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pedido) => {
            const alerta =
              pedido.status !== "entregue"
                ? pedidoAlerta(pedido.data_entrega, pedido.hora_entrega, pedido.hora_retirada)
                : null;
            const isAtrasado = alerta === "atrasado";

            return (
              <Link
                key={pedido.id}
                href={`/pedidos/${pedido.id}`}
                className={cn(
                  "card p-4 block hover:shadow-md transition-all active:scale-[0.99]",
                  isAtrasado && "border-l-4 border-l-red-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-sm text-gray-900">
                        {pedido.clientes?.nome ?? "Sem cliente"}
                      </span>
                      <StatusBadge status={pedido.status} />
                      <AlertaBadge
                        dataEntrega={pedido.data_entrega}
                        status={pedido.status}
                        horaEntrega={pedido.hora_entrega}
                        horaRetirada={pedido.hora_retirada}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span className="font-medium">{TIPO_LABELS[pedido.tipo]}</span>
                      {pedido.peso && <span>{pedido.peso}kg</span>}
                      {pedido.quantidade && <span>{pedido.quantidade} un.</span>}
                      <span className="flex items-center gap-0.5">
                        <Calendar size={11} className="text-gray-400" />
                        {formatDate(pedido.data_entrega)}
                      </span>
                    </div>
                    {pedido.descricao && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{pedido.descricao}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
