"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ChevronRight, Calendar, FileEdit, Trash2, LayoutList, CalendarDays } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { cn, formatDate, isEntregaHoje, isEntregaSemana, pedidoAlerta } from "@/lib/utils";
import { TIPO_LABELS, STATUS_LABELS, type PedidoComCliente, type StatusPedido } from "@/types/database";
import { excluirRascunhoAction } from "./actions";
import { PedidosCalendar } from "./PedidosCalendar";

type Filtro = "todos" | "hoje" | "semana" | "atrasados" | StatusPedido;

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunhos" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "atrasados", label: "Atrasados" },
  { value: "novo", label: STATUS_LABELS.novo },
  { value: "produzindo", label: STATUS_LABELS.produzindo },
  { value: "feito", label: STATUS_LABELS.feito },
  { value: "entregue", label: STATUS_LABELS.entregue },
  { value: "cancelado", label: STATUS_LABELS.cancelado },
];

const STATUS_BORDER: Record<StatusPedido, string> = {
  rascunho: "border-l-4 border-l-amber-400",
  novo: "border-l-4 border-l-blue-400",
  produzindo: "border-l-4 border-l-yellow-400",
  feito: "border-l-4 border-l-green-400",
  entregue: "border-l-4 border-l-gray-300",
  cancelado: "border-l-4 border-l-red-300",
};

function matchesFiltro(p: PedidoComCliente, filtro: Filtro): boolean {
  switch (filtro) {
    case "hoje":
      return isEntregaHoje(p.data_entrega) && p.status !== "rascunho" && p.status !== "cancelado";
    case "semana":
      return isEntregaSemana(p.data_entrega) && p.status !== "rascunho" && p.status !== "cancelado";
    case "atrasados":
      return (
        pedidoAlerta(p.data_entrega, p.hora_entrega, p.hora_retirada) === "atrasado" &&
        p.status !== "entregue" &&
        p.status !== "rascunho" &&
        p.status !== "cancelado"
      );
    case "todos":
      return p.status !== "cancelado";
    default:
      return p.status === filtro;
  }
}

function getNomeDisplay(pedido: PedidoComCliente): string {
  return pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente";
}

type Visualizacao = "lista" | "calendario";

export function PedidosList({ pedidos }: { pedidos: PedidoComCliente[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("lista");
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<string | null>(null);
  const [localDeleted, setLocalDeleted] = useState<Set<string>>(new Set());
  const [isPendingExclusao, startExclusaoTransition] = useTransition();

  const pedidosVisiveis = pedidos.filter((p) => !localDeleted.has(p.id));

  const pedidosCalendario = useMemo(() => {
    if (!busca) return pedidosVisiveis;
    const q = busca.toLowerCase();
    return pedidosVisiveis.filter((p) =>
      getNomeDisplay(p).toLowerCase().includes(q)
    );
  }, [pedidosVisiveis, busca]);

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<Filtro, number>> = {};
    for (const { value } of FILTROS) {
      counts[value] = pedidosVisiveis.filter((p) => matchesFiltro(p, value)).length;
    }
    return counts;
  }, [pedidosVisiveis]);

  const atrasadosCount = filterCounts["atrasados"] ?? 0;
  const rascunhosCount = filterCounts["rascunho"] ?? 0;
  const canceladosCount = filterCounts["cancelado"] ?? 0;

  const filtered = pedidosVisiveis.filter((p) => {
    const nome = getNomeDisplay(p).toLowerCase();
    if (busca && !nome.includes(busca.toLowerCase())) return false;
    return matchesFiltro(p, filtro);
  });

  function confirmarExclusao(pedidoId: string) {
    setLocalDeleted((prev) => new Set(prev).add(pedidoId));
    setConfirmandoExclusaoId(null);
    startExclusaoTransition(async () => {
      const result = await excluirRascunhoAction(pedidoId);
      if (result.error) {
        setLocalDeleted((prev) => {
          const next = new Set(prev);
          next.delete(pedidoId);
          return next;
        });
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="space-y-3">
        {/* Busca + toggle de visualização */}
        <div className="flex gap-2">
          <div className="relative flex-1">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* Toggle lista/calendário */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5 flex-shrink-0">
            <button
              onClick={() => setVisualizacao("lista")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                visualizacao === "lista"
                  ? "bg-brand-50 text-brand-600"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )}
              aria-label="Visualização em lista"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setVisualizacao("calendario")}
              className={cn(
                "p-2 rounded-lg transition-colors",
                visualizacao === "calendario"
                  ? "bg-brand-50 text-brand-600"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              )}
              aria-label="Visualização em calendário"
            >
              <CalendarDays size={16} />
            </button>
          </div>
        </div>

        {/* Calendário */}
        {visualizacao === "calendario" && (
          <PedidosCalendar pedidos={pedidosCalendario} />
        )}

        {/* Filtros, contagem e lista — apenas na visualização em lista */}
        {visualizacao === "lista" && (
        <>
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {FILTROS.map(({ value, label }) => {
              const count = filterCounts[value] ?? 0;
              const isActive = filtro === value;
              const isAtrasados = value === "atrasados";
              const isRascunho = value === "rascunho";
              const isCancelado = value === "cancelado";
              const hasUrgent = isAtrasados && atrasadosCount > 0;
              const hasDraft = isRascunho && rascunhosCount > 0;

              return (
                <button
                  key={value}
                  onClick={() => setFiltro(value)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 min-h-[36px]",
                    isActive
                      ? hasUrgent
                        ? "bg-red-600 text-white"
                        : hasDraft
                        ? "bg-amber-500 text-white"
                        : isCancelado
                        ? "bg-red-500 text-white"
                        : "bg-brand-600 text-white"
                      : hasUrgent
                      ? "bg-red-50 text-red-700 border border-red-200 hover:border-red-300"
                      : hasDraft
                      ? "bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300"
                      : isCancelado && canceladosCount > 0
                      ? "bg-red-50 text-red-600 border border-red-200 hover:border-red-300"
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
                          : hasDraft
                          ? "bg-amber-100 text-amber-700"
                          : isCancelado
                          ? "bg-red-100 text-red-600"
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
          <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-gray-100 to-transparent" />
        </div>

        {/* Contagem */}

        <p className="text-xs text-gray-500">
          {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
          {filtro === "todos" && atrasadosCount > 0 && (
            <span className="text-red-600 font-medium ml-1">
              · {atrasadosCount} atrasado{atrasadosCount !== 1 ? "s" : ""}
            </span>
          )}
          {filtro === "todos" && rascunhosCount > 0 && (
            <span className="text-amber-600 font-medium ml-1">
              · {rascunhosCount} rascunho{rascunhosCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>

        {/* Lista */}
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
              const isRascunho = pedido.status === "rascunho";
              const isCancelado = pedido.status === "cancelado";
              const alerta =
                !isRascunho && !isCancelado && pedido.status !== "entregue"
                  ? pedidoAlerta(pedido.data_entrega, pedido.hora_entrega, pedido.hora_retirada)
                  : null;
              const isAtrasado = alerta === "atrasado";

              return (
                <div key={pedido.id} className="relative">
                  <Link
                    href={`/pedidos/${pedido.id}`}
                    className={cn(
                      "card p-4 block hover:shadow-md transition-all active:scale-[0.99]",
                      isAtrasado ? "border-l-4 border-l-red-400" : STATUS_BORDER[pedido.status],
                      isCancelado && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("flex-1 min-w-0", isRascunho && "pr-6")}>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={cn(
                            "font-semibold text-sm text-gray-900",
                            isCancelado && "line-through text-gray-500"
                          )}>
                            {getNomeDisplay(pedido)}
                          </span>
                          <StatusBadge status={pedido.status} />
                          {!isRascunho && !isCancelado && (
                            <AlertaBadge
                              dataEntrega={pedido.data_entrega}
                              status={pedido.status}
                              horaEntrega={pedido.hora_entrega}
                              horaRetirada={pedido.hora_retirada}
                            />
                          )}
                          {isRascunho && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                              <FileEdit size={8} />
                              Incompleto
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          {!isRascunho && (
                            <span className="font-medium">{TIPO_LABELS[pedido.tipo]}</span>
                          )}
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
                      {!isRascunho && (
                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                      )}
                    </div>
                  </Link>

                  {/* Botão de exclusão — rascunhos apenas */}
                  {isRascunho && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setConfirmandoExclusaoId(pedido.id);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                      aria-label="Excluir rascunho"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </div>

      {/* Confirmação de exclusão — bottom sheet */}
      {confirmandoExclusaoId && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setConfirmandoExclusaoId(null)}
            aria-hidden="true"
          />
          <div
            className="fixed left-0 right-0 z-50 px-4"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
          >
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trash2 size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">Excluir rascunho?</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Esta ação não pode ser desfeita</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmandoExclusaoId(null)}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => confirmarExclusao(confirmandoExclusaoId)}
                    disabled={isPendingExclusao}
                    className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    {isPendingExclusao ? "Excluindo..." : "Excluir"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
