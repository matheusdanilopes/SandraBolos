"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  CheckCircle2,
  Circle,
  ExternalLink,
  Save,
  Banknote,
  Layers,
  X,
  RotateCcw,
  Square,
  CheckSquare,
} from "lucide-react";
import { formatDate, formatCurrency, pedidoNumero } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { TOPPER_LABELS, type PedidoComTopper, type TopperPedido } from "@/types/database";
import {
  salvarTopperAction,
  toggleSolicitadoAction,
  toggleRecebidoAction,
  registrarPagamentoAction,
  desfazerPagamentoAction,
  registrarPagamentoLoteAction,
} from "./actions";
import { cn } from "@/lib/utils";

interface Props {
  pedidos: PedidoComTopper[];
}

type Filtro = "todos" | "pendentes" | "solicitados" | "recebidos" | "a_pagar" | "pagos";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusBorder(topper: TopperPedido | null | undefined): string {
  if (topper?.pago_fornecedor) return "border-l-4 border-l-emerald-400";
  if (topper?.recebido) return "border-l-4 border-l-green-400";
  if (topper?.solicitado) return "border-l-4 border-l-blue-400";
  return "border-l-4 border-l-gray-200";
}

// ─── Card individual ────────────────────────────────────────────────────────

interface TopperCardProps {
  pedido: PedidoComTopper;
  batchMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}

function TopperCard({ pedido, batchMode, selected, onToggleSelect }: TopperCardProps) {
  const topper = pedido.toppers_pedido as TopperPedido | null | undefined;
  const [expanded, setExpanded] = useState(!topper);
  const [isPending, startTransition] = useTransition();

  const [fornecedor, setFornecedor] = useState(topper?.fornecedor ?? "");
  const [valor, setValor] = useState(topper?.valor?.toString() ?? "0");
  const [frete, setFrete] = useState(topper?.frete?.toString() ?? "0");
  const [observacoes, setObservacoes] = useState(topper?.observacoes ?? "");
  const [erroDetalhes, setErroDetalhes] = useState<string | null>(null);
  const [salvoOk, setSalvoOk] = useState(false);

  const [showPagamento, setShowPagamento] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(todayISO());
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);

  const nomeCliente = pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente";
  const numero = pedidoNumero(pedido.created_at, pedido.id);
  const totalFornecedor = (topper?.valor ?? 0) + (topper?.frete ?? 0);
  const pagavel = totalFornecedor > 0 && !topper?.pago_fornecedor;

  function handleSalvar() {
    setErroDetalhes(null);
    setSalvoOk(false);
    startTransition(async () => {
      const res = await salvarTopperAction({
        pedidoId: pedido.id,
        fornecedor: fornecedor || undefined,
        valor: parseFloat(valor) || 0,
        frete: parseFloat(frete) || 0,
        observacoes: observacoes || undefined,
      });
      if (res.error) setErroDetalhes(res.error);
      else {
        setSalvoOk(true);
        setTimeout(() => setSalvoOk(false), 2000);
      }
    });
  }

  function handleToggleSolicitado() {
    startTransition(async () => {
      await toggleSolicitadoAction(pedido.id, !topper?.solicitado);
    });
  }

  function handleToggleRecebido() {
    startTransition(async () => {
      await toggleRecebidoAction(pedido.id, !topper?.recebido);
    });
  }

  function handleRegistrarPagamento() {
    setErroPagamento(null);
    startTransition(async () => {
      const res = await registrarPagamentoAction(pedido.id, dataPagamento);
      if (res.error) setErroPagamento(res.error);
      else setShowPagamento(false);
    });
  }

  function handleDesfazerPagamento() {
    startTransition(async () => {
      await desfazerPagamentoAction(pedido.id);
    });
  }

  return (
    <div
      className={cn(
        "card overflow-hidden transition-opacity",
        getStatusBorder(topper),
        isPending && "opacity-60",
        batchMode && selected && "ring-2 ring-brand-400 ring-offset-1"
      )}
    >
      <div className="p-4">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          {batchMode && pagavel && (
            <button
              onClick={onToggleSelect}
              className="mt-0.5 flex-shrink-0 text-brand-600"
              aria-label={selected ? "Desmarcar" : "Selecionar"}
            >
              {selected ? <CheckSquare size={18} /> : <Square size={18} className="text-gray-400" />}
            </button>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[10px] text-gray-400 font-mono">{numero}</span>
              <StatusBadge status={pedido.status} />
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                {TOPPER_LABELS[pedido.topper as keyof typeof TOPPER_LABELS]}
              </span>
            </div>
            <p className="font-semibold text-gray-900 truncate">{nomeCliente}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-gray-500">Entrega: {formatDate(pedido.data_entrega)}</p>
              {topper?.fornecedor && (
                <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                  <Package size={11} />
                  {topper.fornecedor}
                </p>
              )}
            </div>
          </div>

          <Link
            href={`/pedidos/${pedido.id}`}
            className="text-gray-400 hover:text-brand-600 flex-shrink-0 mt-1 p-1 -mr-1 rounded transition-colors"
            title="Ver pedido"
          >
            <ExternalLink size={15} />
          </Link>
        </div>

        {/* Status de progresso */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={handleToggleSolicitado}
            disabled={isPending}
            className={cn(
              "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all",
              topper?.solicitado
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium"
                : "bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
            )}
          >
            {topper?.solicitado ? <CheckCircle2 size={12} /> : <Circle size={12} />}
            Solicitado
          </button>

          <button
            onClick={handleToggleRecebido}
            disabled={isPending}
            className={cn(
              "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all",
              topper?.recebido
                ? "bg-green-50 border-green-300 text-green-700 font-medium"
                : "bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600"
            )}
          >
            {topper?.recebido ? <CheckCircle2 size={12} /> : <Circle size={12} />}
            Recebido
          </button>
        </div>

        {/* Resumo financeiro compacto */}
        {totalFornecedor > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
            <span className="text-gray-500">Topper {formatCurrency(topper?.valor ?? 0)}</span>
            {(topper?.frete ?? 0) > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">Frete {formatCurrency(topper?.frete ?? 0)}</span>
              </>
            )}
            <span className="ml-auto font-semibold text-brand-700">{formatCurrency(totalFornecedor)}</span>
          </div>
        )}

        {/* Bloco de pagamento */}
        {totalFornecedor > 0 && (
          <div className="mt-2.5">
            {topper?.pago_fornecedor ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">Pago ao fornecedor</p>
                    {topper.data_pagamento && (
                      <p className="text-[10px] text-emerald-600">{formatDate(topper.data_pagamento)}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDesfazerPagamento}
                  disabled={isPending}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                  title="Desfazer pagamento"
                >
                  <RotateCcw size={11} />
                  Desfazer
                </button>
              </div>
            ) : showPagamento ? (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2.5">
                <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
                  <Banknote size={13} />
                  Registrar pagamento ao fornecedor
                </p>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Data do pagamento</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Total: <strong className="text-orange-700">{formatCurrency(totalFornecedor)}</strong>
                  </span>
                </div>
                {erroPagamento && <p className="text-xs text-red-600">{erroPagamento}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleRegistrarPagamento}
                    disabled={isPending}
                    className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={13} />
                    {isPending ? "Salvando…" : "Confirmar pagamento"}
                  </button>
                  <button
                    onClick={() => setShowPagamento(false)}
                    disabled={isPending}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowPagamento(true)}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-orange-600 border border-orange-200 bg-orange-50 hover:bg-orange-100 rounded-lg px-3 py-2 transition-colors"
              >
                <Banknote size={13} />
                Registrar pagamento ao fornecedor
              </button>
            )}
          </div>
        )}

        {/* Expandir / recolher detalhes */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
        >
          {expanded ? (
            <><ChevronUp size={14} /> Recolher detalhes</>
          ) : (
            <><ChevronDown size={14} /> Editar fornecedor / valores</>
          )}
        </button>
      </div>

      {/* Formulário de detalhes */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <div>
            <label className="label text-xs">Fornecedor</label>
            <input
              type="text"
              className="input text-sm"
              placeholder="Nome do fornecedor"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs flex items-center gap-1">
                <Package size={12} /> Valor do topper
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input text-sm pl-8"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label text-xs flex items-center gap-1">
                <Truck size={12} /> Frete
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input text-sm pl-8"
                  value={frete}
                  onChange={(e) => setFrete(e.target.value)}
                />
              </div>
            </div>
          </div>

          {(parseFloat(valor) || 0) + (parseFloat(frete) || 0) > 0 && (
            <p className="text-xs text-center text-brand-600 font-medium bg-brand-50 rounded-lg py-1.5">
              Total:{" "}
              <strong>{formatCurrency((parseFloat(valor) || 0) + (parseFloat(frete) || 0))}</strong>
            </p>
          )}

          <div>
            <label className="label text-xs">Observações</label>
            <textarea
              className="input text-sm resize-none"
              rows={2}
              placeholder="Cor, tema, detalhes…"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {erroDetalhes && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{erroDetalhes}</p>
          )}

          <button
            onClick={handleSalvar}
            disabled={isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
          >
            {salvoOk ? (
              <><CheckCircle2 size={15} /> Salvo!</>
            ) : (
              <><Save size={15} /> {isPending ? "Salvando…" : "Salvar detalhes"}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Lista principal ─────────────────────────────────────────────────────────

export function ToppersList({ pedidos }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchDate, setBatchDate] = useState(todayISO());
  const [isBatchPending, startBatchTransition] = useTransition();
  const [batchErro, setBatchErro] = useState<string | null>(null);

  const pagaveisFiltrados = pedidos.filter((p) => {
    const t = p.toppers_pedido as TopperPedido | null;
    return t && !t.pago_fornecedor && (t.valor + t.frete) > 0;
  });

  const totalToppers = pedidos.length;
  const totalAReceber = pedidos.filter(
    (p) => !(p.toppers_pedido as TopperPedido | null)?.recebido
  ).length;
  const totalAPagar = pagaveisFiltrados.reduce((acc, p) => {
    const t = p.toppers_pedido as TopperPedido;
    return acc + t.valor + t.frete;
  }, 0);
  const totalJaPago = pedidos
    .filter((p) => (p.toppers_pedido as TopperPedido | null)?.pago_fornecedor)
    .reduce((acc, p) => {
      const t = p.toppers_pedido as TopperPedido;
      return acc + t.valor + t.frete;
    }, 0);

  const pedidosFiltrados = pedidos.filter((p) => {
    const t = p.toppers_pedido as TopperPedido | null;
    if (filtro === "pendentes") return !t?.solicitado;
    if (filtro === "solicitados") return t?.solicitado && !t?.recebido;
    if (filtro === "recebidos") return t?.recebido;
    if (filtro === "a_pagar") return t && !t.pago_fornecedor && (t.valor + t.frete) > 0;
    if (filtro === "pagos") return t?.pago_fornecedor;
    return true;
  });

  const filtros: { key: Filtro; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: totalToppers },
    {
      key: "pendentes",
      label: "Pendentes",
      count: pedidos.filter((p) => !(p.toppers_pedido as TopperPedido | null)?.solicitado).length,
    },
    {
      key: "solicitados",
      label: "Solicitados",
      count: pedidos.filter((p) => {
        const t = p.toppers_pedido as TopperPedido | null;
        return t?.solicitado && !t?.recebido;
      }).length,
    },
    {
      key: "recebidos",
      label: "Recebidos",
      count: pedidos.filter((p) => (p.toppers_pedido as TopperPedido | null)?.recebido).length,
    },
    {
      key: "a_pagar",
      label: "A pagar",
      count: pagaveisFiltrados.length,
    },
    {
      key: "pagos",
      label: "Pagos",
      count: pedidos.filter((p) => (p.toppers_pedido as TopperPedido | null)?.pago_fornecedor).length,
    },
  ];

  const pagaveisVisiveis = pedidosFiltrados.filter((p) => {
    const t = p.toppers_pedido as TopperPedido | null;
    return t && !t.pago_fornecedor && (t.valor + t.frete) > 0;
  });
  const todosVissiveisSelecionados =
    pagaveisVisiveis.length > 0 &&
    pagaveisVisiveis.every((p) => selectedIds.has(p.id));

  function toggleSelectAll() {
    if (todosVissiveisSelecionados) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagaveisVisiveis.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pagaveisVisiveis.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitBatchMode() {
    setBatchMode(false);
    setSelectedIds(new Set());
    setShowBatchPanel(false);
  }

  const totalSelecionado = Array.from(selectedIds).reduce((acc, id) => {
    const pedido = pedidos.find((p) => p.id === id);
    const t = pedido?.toppers_pedido as TopperPedido | null;
    return acc + (t ? t.valor + t.frete : 0);
  }, 0);

  function handlePagarLote() {
    setBatchErro(null);
    startBatchTransition(async () => {
      const res = await registrarPagamentoLoteAction(Array.from(selectedIds), batchDate);
      if (res.error) {
        setBatchErro(res.error);
      } else {
        setShowBatchPanel(false);
        setSelectedIds(new Set());
        setBatchMode(false);
      }
    });
  }

  return (
    <div className="space-y-4 pb-52">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Layers size={16} className="text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-none">{totalToppers}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Pedidos com topper</p>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Truck size={16} className="text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-orange-600 leading-none">{totalAReceber}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Aguardando recebimento</p>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <Banknote size={16} className="text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-red-500 leading-none">{formatCurrency(totalAPagar)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">A pagar fornecedores</p>
          </div>
        </div>

        <div className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-emerald-600 leading-none">{formatCurrency(totalJaPago)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Já pago fornecedores</p>
          </div>
        </div>
      </div>

      {/* Barra de filtros + botão lote */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-hide">
          {filtros.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filtro === key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
              )}
            >
              {label}
              <span
                className={cn(
                  "text-[10px] px-1 rounded-full min-w-[16px] text-center",
                  filtro === key ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {pagaveisFiltrados.length > 0 && (
          <button
            onClick={() => (batchMode ? exitBatchMode() : setBatchMode(true))}
            className={cn(
              "flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
              batchMode
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
            )}
          >
            <Layers size={13} />
            {batchMode ? "Sair" : "Pagar em lote"}
          </button>
        )}
      </div>

      {/* Barra de seleção de lote */}
      {batchMode && pagaveisVisiveis.length > 0 && (
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-brand-700 font-medium"
          >
            {todosVissiveisSelecionados ? (
              <CheckSquare size={15} />
            ) : (
              <Square size={15} className="text-brand-400" />
            )}
            {todosVissiveisSelecionados ? "Desmarcar todos" : "Selecionar todos"}
          </button>
          {selectedIds.size > 0 && (
            <span className="ml-auto text-xs text-brand-700 font-semibold">
              {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""} •{" "}
              {formatCurrency(totalSelecionado)}
            </span>
          )}
        </div>
      )}

      {/* Lista */}
      {pedidosFiltrados.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Layers size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium text-sm">Nenhum topper encontrado</p>
          <p className="text-xs text-gray-400 mt-1">
            {filtro === "todos" ? "Não há pedidos com topper cadastrados" : "Tente outro filtro"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map((pedido) => (
            <TopperCard
              key={pedido.id}
              pedido={pedido}
              batchMode={batchMode}
              selected={selectedIds.has(pedido.id)}
              onToggleSelect={() => toggleSelect(pedido.id)}
            />
          ))}
        </div>
      )}

      {/* ── Barra flutuante de pagamento em lote (acima da nav) ── */}
      {batchMode && selectedIds.size > 0 && (
        <div
          className="fixed left-0 right-0 z-50"
          style={{ bottom: "calc(52px + env(safe-area-inset-bottom, 0px))" }}
        >
          {showBatchPanel && (
            <div className="bg-white border-t border-gray-200 shadow-lg px-4 py-4 space-y-3 max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">
                  Pagamento em lote — {selectedIds.size} topper{selectedIds.size > 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => setShowBatchPanel(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded"
                >
                  <X size={18} />
                </button>
              </div>
              <div>
                <label className="label text-xs">Data do pagamento</label>
                <input
                  type="date"
                  className="input text-sm"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total a registrar:</span>
                <span className="font-bold text-brand-700">{formatCurrency(totalSelecionado)}</span>
              </div>
              {batchErro && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{batchErro}</p>
              )}
              <button
                onClick={handlePagarLote}
                disabled={isBatchPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Banknote size={16} />
                {isBatchPending
                  ? "Registrando…"
                  : `Confirmar pagamento de ${selectedIds.size} topper${selectedIds.size > 1 ? "s" : ""}`}
              </button>
            </div>
          )}

          <div className="bg-brand-600 text-white px-4 py-3 flex items-center justify-between gap-3 max-w-2xl mx-auto">
            <div>
              <p className="text-sm font-semibold">
                {selectedIds.size} topper{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-brand-200">{formatCurrency(totalSelecionado)}</p>
            </div>
            <button
              onClick={() => setShowBatchPanel((v) => !v)}
              className="bg-white text-brand-700 font-semibold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-brand-50 transition-colors"
            >
              <Banknote size={15} />
              {showBatchPanel ? "Fechar" : "Registrar pagamento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
