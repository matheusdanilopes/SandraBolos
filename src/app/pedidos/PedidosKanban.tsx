"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Circle,
  FileEdit,
  Loader2,
  Package,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  STATUS_LABELS,
  TIPO_LABELS,
  type PedidoComCliente,
  type StatusPedido,
} from "@/types/database";
import { cn, formatCurrency, formatDate, calcularValorFinal, pedidoAlerta, pedidoNumero } from "@/lib/utils";
import { avancarStatusAction, voltarStatusAction, cancelarPedidoAction } from "./[id]/actions";

/** Ordem das colunas do quadro — a mesma ordem em que um pedido percorre a cozinha. */
const COLUNAS: { status: StatusPedido; icon: typeof Circle }[] = [
  { status: "rascunho", icon: FileEdit },
  { status: "novo", icon: Circle },
  { status: "produzindo", icon: Loader2 },
  { status: "feito", icon: CheckCircle2 },
  { status: "entregue", icon: Package },
  { status: "cancelado", icon: XCircle },
];

/** Cores por coluna — mesma paleta do StatusBadge, só que aplicada ao cabeçalho do quadro. */
const COLUNA_COR: Record<StatusPedido, { header: string; dot: string; ring: string }> = {
  rascunho: { header: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400", ring: "ring-amber-300" },
  novo: { header: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400", ring: "ring-blue-300" },
  produzindo: { header: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-400", ring: "ring-yellow-300" },
  feito: { header: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-400", ring: "ring-green-300" },
  entregue: { header: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400", ring: "ring-gray-300" },
  cancelado: { header: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-400", ring: "ring-red-300" },
};

/** Fluxo linear que dá para arrastar (rascunho depende de completar o formulário; cancelado é fim de linha). */
const FLUXO_ARRASTAVEL: StatusPedido[] = ["novo", "produzindo", "feito", "entregue"];
const CANCELAVEIS: StatusPedido[] = ["novo", "produzindo", "feito"];

type Acao = "avancar" | "voltar" | "cancelar";

function acaoParaMover(origem: StatusPedido, destino: StatusPedido): Acao | null {
  if (origem === destino) return null;
  if (destino === "cancelado") return CANCELAVEIS.includes(origem) ? "cancelar" : null;
  if (origem === "rascunho" || origem === "cancelado" || destino === "rascunho") return null;
  const oi = FLUXO_ARRASTAVEL.indexOf(origem);
  const di = FLUXO_ARRASTAVEL.indexOf(destino);
  if (oi === -1 || di === -1) return null;
  if (di === oi + 1) return "avancar";
  if (di === oi - 1) return "voltar";
  return null;
}

function getNomeDisplay(pedido: PedidoComCliente): string {
  return pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente";
}

export function PedidosKanban({ pedidos }: { pedidos: PedidoComCliente[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, StatusPedido>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<StatusPedido | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [isPendingCancelamento, startCancelamentoTransition] = useTransition();

  const pedidosEfetivos = useMemo(
    () => pedidos.map((p) => (overrides[p.id] ? { ...p, status: overrides[p.id] } : p)),
    [pedidos, overrides]
  );

  const pedidosPorId = useMemo(
    () => new Map(pedidosEfetivos.map((p) => [p.id, p])),
    [pedidosEfetivos]
  );

  const porStatus = useMemo(() => {
    const map = new Map<StatusPedido, PedidoComCliente[]>();
    for (const { status } of COLUNAS) map.set(status, []);
    for (const p of pedidosEfetivos) map.get(p.status)?.push(p);
    return map;
  }, [pedidosEfetivos]);

  function mostrarToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((atual) => (atual === msg ? null : atual)), 3000);
  }

  function handleDrop(pedidoId: string, destino: StatusPedido) {
    const pedido = pedidosPorId.get(pedidoId);
    if (!pedido) return;
    const origem = pedido.status;
    const acao = acaoParaMover(origem, destino);

    if (!acao) {
      if (origem !== destino) {
        mostrarToast(`Não é possível mover diretamente de "${STATUS_LABELS[origem]}" para "${STATUS_LABELS[destino]}".`);
      }
      return;
    }

    if (acao === "cancelar") {
      setCancelandoId(pedidoId);
      return;
    }

    setOverrides((prev) => ({ ...prev, [pedidoId]: destino }));
    startTransition(async () => {
      const result =
        acao === "avancar"
          ? await avancarStatusAction(pedidoId, destino)
          : await voltarStatusAction(pedidoId, destino);
      if (result.error) {
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[pedidoId];
          return next;
        });
        mostrarToast(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function confirmarCancelamento() {
    if (!cancelandoId) return;
    const id = cancelandoId;
    startCancelamentoTransition(async () => {
      const result = await cancelarPedidoAction(id, motivo);
      if (result.error) {
        mostrarToast(result.error);
      } else {
        setOverrides((prev) => ({ ...prev, [id]: "cancelado" }));
        router.refresh();
      }
      setCancelandoId(null);
      setMotivo("");
    });
  }

  const pedidoCancelando = cancelandoId ? pedidosPorId.get(cancelandoId) : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-3 items-start scrollbar-none">
        {COLUNAS.map(({ status, icon: Icon }) => {
          const itens = porStatus.get(status) ?? [];
          const cor = COLUNA_COR[status];
          const isDropTarget = dragOverStatus === status;
          const draggingStatus = draggingId ? pedidosPorId.get(draggingId)?.status : null;
          const isValidTarget = draggingStatus ? !!acaoParaMover(draggingStatus, status) : false;

          return (
            <div
              key={status}
              className={cn(
                "w-[300px] flex-shrink-0 flex flex-col rounded-2xl border bg-gray-50/60 border-gray-200 max-h-[calc(100vh-220px)] transition-shadow",
                isDropTarget && isValidTarget && `ring-2 ${cor.ring}`
              )}
              onDragOver={(e) => {
                if (!draggingStatus || !acaoParaMover(draggingStatus, status)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverStatus !== status) setDragOverStatus(status);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setDragOverStatus(null);
                if (id) handleDrop(id, status);
              }}
            >
              <div className={cn("flex items-center gap-2 px-3 py-2.5 rounded-t-2xl border-b", cor.header)}>
                <Icon size={13} strokeWidth={2.5} className={status === "produzindo" ? "animate-spin" : undefined} />
                <span className="text-xs font-semibold flex-1">{STATUS_LABELS[status]}</span>
                <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-white/70 min-w-[20px] text-center">
                  {itens.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-none">
                {itens.length === 0 ? (
                  <div className="text-center py-8 text-[11px] text-gray-300">Nenhum pedido</div>
                ) : (
                  itens.map((pedido) => (
                    <TicketCard
                      key={pedido.id}
                      pedido={pedido}
                      isDraggable={FLUXO_ARRASTAVEL.includes(pedido.status)}
                      isDragging={draggingId === pedido.id}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", pedido.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(pedido.id);
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverStatus(null);
                      }}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
        </div>
        {/* Sinaliza que há mais colunas fora da área visível — sem isso o corte
            da última coluna parece um bug de layout em vez de rolagem. */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-10 bg-gradient-to-l from-gray-100 to-transparent" />
      </div>

      {/* Toast de erro / transição inválida */}
      {toast && (
        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-50 max-w-md px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-medium shadow-lg flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-300 flex-shrink-0" />
          {toast}
        </div>
      )}

      {/* Confirmação de cancelamento — soltar um card na coluna "Cancelado" */}
      {cancelandoId && pedidoCancelando && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => {
              if (!isPendingCancelamento) {
                setCancelandoId(null);
                setMotivo("");
              }
            }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <XCircle size={16} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Cancelar pedido?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {getNomeDisplay(pedidoCancelando)} · {formatDate(pedidoCancelando.data_entrega)} — o histórico
                    será preservado.
                  </p>
                </div>
              </div>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo (opcional)"
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-gray-400"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCancelandoId(null);
                    setMotivo("");
                  }}
                  disabled={isPendingCancelamento}
                  className="btn-secondary flex-1 text-sm"
                >
                  Voltar
                </button>
                <button
                  onClick={confirmarCancelamento}
                  disabled={isPendingCancelamento}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm px-4 rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[40px] flex items-center justify-center gap-2"
                >
                  {isPendingCancelamento ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Cancelando...
                    </>
                  ) : (
                    "Confirmar cancelamento"
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TicketCard({
  pedido,
  isDraggable,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  pedido: PedidoComCliente;
  isDraggable: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const valor = calcularValorFinal(pedido);
  const isCancelado = pedido.status === "cancelado";
  const isRascunho = pedido.status === "rascunho";
  const alerta =
    !isCancelado && !isRascunho && pedido.status !== "entregue"
      ? pedidoAlerta(pedido.data_entrega, pedido.hora_entrega, pedido.hora_retirada)
      : null;
  const cor = COLUNA_COR[pedido.status];

  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all",
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && "opacity-40",
        isCancelado && "opacity-60"
      )}
    >
      {/* Cabeçalho do bilhete */}
      <div className="px-3 pt-2.5 pb-2 flex items-start justify-between gap-2">
        <span
          className={cn(
            "font-semibold text-[13px] text-gray-900 leading-tight",
            isCancelado && "line-through text-gray-500"
          )}
        >
          {getNomeDisplay(pedido)}
        </span>
        <span className="text-[9px] font-mono text-gray-300 flex-shrink-0 pt-0.5">
          {pedidoNumero(pedido.created_at, pedido.id)}
        </span>
      </div>

      {/* Picote — linha tracejada com "furos" nas laterais, como um bilhete destacável */}
      <div className="relative mx-3">
        <div className="border-t border-dashed border-gray-200" />
        <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gray-50/60 border border-gray-200" />
        <span className="absolute -right-[14px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gray-50/60 border border-gray-200" />
      </div>

      {/* Corpo do bilhete */}
      <div className="px-3 pt-2 pb-3 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500">
          <span className={cn("px-1.5 py-0.5 rounded-full font-medium", cor.header)}>
            {TIPO_LABELS[pedido.tipo]}
          </span>
          {pedido.peso && <span>{pedido.peso}kg</span>}
          {pedido.quantidade && <span>{pedido.quantidade} un.</span>}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <Calendar size={11} className="text-gray-400" />
            {formatDate(pedido.data_entrega)}
            {pedido.hora_entrega && <span className="text-gray-400">· {pedido.hora_entrega}</span>}
          </span>
          {valor != null && (
            <span className="text-[12px] font-semibold text-emerald-600 flex-shrink-0">
              {formatCurrency(valor)}
            </span>
          )}
        </div>

        {alerta === "atrasado" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
            <AlertTriangle size={9} />
            Atrasado
          </span>
        )}
        {isRascunho && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
            <FileEdit size={8} />
            Incompleto — completar antes de avançar
          </span>
        )}
      </div>
    </Link>
  );
}
