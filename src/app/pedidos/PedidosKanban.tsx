"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  CheckCircle2,
  Circle,
  FileEdit,
  Gift,
  ImageIcon,
  Loader2,
  Package,
  Sparkles,
  Store,
  Truck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  STATUS_LABELS,
  TIPO_LABELS,
  etapaDoTopper,
  type EtapaTopper,
  type PedidoComCliente,
  type StatusPedido,
  type UnidadeMedida,
} from "@/types/database";
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  calcularValorFinal,
  pedidoAlerta,
  pedidoNumero,
} from "@/lib/utils";
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

/** Chave de ordenação pelo dia e hora em que o pedido sai; sem hora, vai para o fim do dia. */
function momentoDaSaida(pedido: PedidoComCliente): string {
  return `${pedido.data_entrega} ${pedido.hora_entrega ?? pedido.hora_retirada ?? "99:99"}`;
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
    // O que sai primeiro fica no topo; no histórico (entregue/cancelado), o mais recente.
    map.forEach((lista, status) => {
      const historico = status === "entregue" || status === "cancelado";
      lista.sort((a, b) => (historico ? -1 : 1) * momentoDaSaida(a).localeCompare(momentoDaSaida(b)));
    });
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

/** Peso com vírgula e sem zeros sobrando: 1,5 kg em vez de 1.500 kg. */
const pesoFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

function formatQtdItem(quantidade: number, unidade?: UnidadeMedida): string {
  if (unidade === "peso_kg") return `${pesoFormatter.format(quantidade)} kg`;
  return `${Math.round(quantidade)} un.`;
}

/** O que a cozinha tem que produzir: os itens lançados ou, sem eles, o tipo com peso/quantidade do pedido. */
function oQueFazer(pedido: PedidoComCliente): { qtd: string | null; nome: string }[] {
  const itens = (pedido.itens_pedido ?? []).filter((i) => i.nome_produto);
  if (itens.length > 0) {
    return itens.map((i) => ({
      qtd: i.quantidade != null ? formatQtdItem(Number(i.quantidade), i.unidade_medida) : null,
      nome: i.nome_produto!,
    }));
  }
  const qtd = pedido.peso
    ? `${pesoFormatter.format(pedido.peso)} kg`
    : pedido.quantidade
    ? `${pedido.quantidade} un.`
    : null;
  return [{ qtd, nome: TIPO_LABELS[pedido.tipo] }];
}

/** "Hoje", "Amanhã" ou o dia da semana com a data — o que interessa para planejar a produção. */
function diaLabel(dataEntrega: string): string {
  const data = parseISO(dataEntrega);
  if (isToday(data)) return "Hoje";
  if (isTomorrow(data)) return "Amanhã";
  return format(data, "EEE dd/MM", { locale: ptBR });
}

const TOPPER_ETAPA: Record<EtapaTopper, { label: string; cls: string }> = {
  pendente: { label: "Topper: encomendar", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  solicitado: { label: "Topper: a caminho", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  recebido: { label: "Topper: chegou", cls: "bg-green-50 text-green-700 border-green-200" },
};

/** Faixa do topo do bilhete: quando o pedido sai, colorida pela urgência. */
const PRAZO_COR: Record<"atrasado" | "entrega_hoje" | "vence_amanha" | "normal", string> = {
  atrasado: "bg-red-50 text-red-700 border-red-100",
  entrega_hoje: "bg-blue-50 text-blue-700 border-blue-100",
  vence_amanha: "bg-orange-50 text-orange-700 border-orange-100",
  normal: "bg-gray-50 text-gray-600 border-gray-100",
};

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
  const isEntregue = pedido.status === "entregue";
  // Entregue e cancelado já saíram da cozinha: o bilhete fica enxuto para a
  // coluna de histórico não empurrar o que ainda tem trabalho.
  const isAtivo = !isCancelado && !isEntregue;
  const alerta = isAtivo && !isRascunho
    ? pedidoAlerta(pedido.data_entrega, pedido.hora_entrega, pedido.hora_retirada)
    : null;
  const hora = pedido.hora_entrega ?? pedido.hora_retirada;
  const modo = pedido.hora_entrega ? "Entrega" : pedido.hora_retirada ? "Retirada" : null;
  const ModoIcon = pedido.hora_entrega ? Truck : Store;
  const fichaTopper = Array.isArray(pedido.toppers_pedido) ? pedido.toppers_pedido[0] : pedido.toppers_pedido;
  const etapaTopper = pedido.topper === "sim" ? etapaDoTopper(fichaTopper) : null;
  const fotos = pedido.imagens_pedido?.[0]?.count ?? 0;

  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden",
        isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && "opacity-40",
        isCancelado && "opacity-60",
        alerta === "atrasado" && "border-red-300"
      )}
    >
      {/* Quando sai — dia, hora e se é entrega ou retirada */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 border-b text-[11px]",
          PRAZO_COR[alerta ?? "normal"]
        )}
      >
        {alerta === "atrasado" ? (
          <AlertTriangle size={11} className="flex-shrink-0" />
        ) : (
          <Calendar size={11} className="flex-shrink-0 opacity-70" />
        )}
        <span className="font-semibold capitalize">{diaLabel(pedido.data_entrega)}</span>
        {hora && <span className="font-semibold">· {formatTime(hora)}</span>}
        {alerta === "atrasado" && <span className="font-semibold">· Atrasado</span>}
        {modo && (
          <span className="ml-auto flex items-center gap-1 flex-shrink-0 opacity-80">
            <ModoIcon size={11} />
            {modo}
          </span>
        )}
      </div>

      {/* Cliente */}
      <div className="px-3 pt-2 pb-1.5 flex items-start justify-between gap-2">
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
        <span className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gray-50 border border-gray-200" />
        <span className="absolute -right-[19px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gray-50 border border-gray-200" />
      </div>

      {/* O que fazer */}
      <div className="px-3 pt-2 pb-2.5 space-y-2">
        {isAtivo ? (
          <ul className="space-y-0.5">
            {oQueFazer(pedido).map((item, i) => (
              <li key={i} className="flex items-baseline gap-1.5 text-[12px] leading-snug">
                {item.qtd && (
                  <span className="font-bold text-gray-900 tabular-nums flex-shrink-0">{item.qtd}</span>
                )}
                <span className="text-gray-700">{item.nome}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-gray-500 truncate">
            {oQueFazer(pedido)
              .map((item) => (item.qtd ? `${item.qtd} ${item.nome}` : item.nome))
              .join(" · ")}
          </p>
        )}

        {isAtivo && pedido.descricao && (
          <p
            className="text-[11px] text-gray-600 leading-snug whitespace-pre-line line-clamp-4 bg-amber-50/40 border-l-2 border-amber-200 pl-2 py-0.5"
            title={pedido.descricao}
          >
            {pedido.descricao}
          </p>
        )}

        {isAtivo && (etapaTopper || pedido.topper === "brinde" || fotos > 0 || isRascunho) && (
          <div className="flex items-center gap-1 flex-wrap">
            {etapaTopper && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                  TOPPER_ETAPA[etapaTopper].cls
                )}
              >
                <Sparkles size={9} />
                {TOPPER_ETAPA[etapaTopper].label}
              </span>
            )}
            {pedido.topper === "brinde" && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-pink-50 text-pink-700 border-pink-200">
                <Gift size={9} />
                Topper de brinde
              </span>
            )}
            {fotos > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border bg-gray-50 text-gray-600 border-gray-200">
                <ImageIcon size={9} />
                {fotos === 1 ? "1 foto" : `${fotos} fotos`}
              </span>
            )}
            {isRascunho && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                <FileEdit size={8} />
                Incompleto — completar antes de avançar
              </span>
            )}
          </div>
        )}

        {valor != null && (
          <div className="flex justify-end">
            <span className="text-[11px] font-semibold text-emerald-600">{formatCurrency(valor)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
