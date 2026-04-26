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
} from "lucide-react";
import { formatDate, formatCurrency, pedidoNumero } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { TOPPER_LABELS, type PedidoComTopper, type TopperPedido } from "@/types/database";
import {
  salvarTopperAction,
  toggleSolicitadoAction,
  toggleRecebidoAction,
  togglePagoFornecedorAction,
} from "./actions";

interface Props {
  pedidos: PedidoComTopper[];
}

type Filtro = "todos" | "pendentes" | "solicitados" | "recebidos" | "a_pagar";

function TopperCard({ pedido }: { pedido: PedidoComTopper }) {
  const topper = pedido.toppers_pedido as TopperPedido | null | undefined;
  const [expanded, setExpanded] = useState(!topper);
  const [isPending, startTransition] = useTransition();

  const [fornecedor, setFornecedor] = useState(topper?.fornecedor ?? "");
  const [valor, setValor] = useState(topper?.valor?.toString() ?? "0");
  const [frete, setFrete] = useState(topper?.frete?.toString() ?? "0");
  const [observacoes, setObservacoes] = useState(topper?.observacoes ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvoOk, setSalvoOk] = useState(false);

  const nomeCliente =
    pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente";
  const numero = pedidoNumero(pedido.created_at, pedido.id);
  const totalFornecedor = (topper?.valor ?? 0) + (topper?.frete ?? 0);

  function handleSalvar() {
    setErro(null);
    setSalvoOk(false);
    startTransition(async () => {
      const res = await salvarTopperAction({
        pedidoId: pedido.id,
        fornecedor: fornecedor || undefined,
        valor: parseFloat(valor) || 0,
        frete: parseFloat(frete) || 0,
        observacoes: observacoes || undefined,
      });
      if (res.error) {
        setErro(res.error);
      } else {
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

  function handleTogglePago() {
    startTransition(async () => {
      await togglePagoFornecedorAction(pedido.id, !topper?.pago_fornecedor);
    });
  }

  return (
    <div className={`card overflow-hidden ${isPending ? "opacity-60" : ""}`}>
      {/* Cabeçalho do card */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-[10px] text-gray-400 font-mono">{numero}</span>
              <StatusBadge status={pedido.status} />
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                {TOPPER_LABELS[pedido.topper as keyof typeof TOPPER_LABELS]}
              </span>
            </div>
            <p className="font-semibold text-gray-900 truncate">{nomeCliente}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Entrega: {formatDate(pedido.data_entrega)}
            </p>
          </div>

          <Link
            href={`/pedidos/${pedido.id}`}
            className="text-gray-400 hover:text-brand-600 flex-shrink-0 mt-1"
            title="Ver pedido"
          >
            <ExternalLink size={15} />
          </Link>
        </div>

        {/* Badges de status do topper */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={handleToggleSolicitado}
            disabled={isPending}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
              topper?.solicitado
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {topper?.solicitado ? (
              <CheckCircle2 size={12} />
            ) : (
              <Circle size={12} />
            )}
            Solicitado
          </button>

          <button
            onClick={handleToggleRecebido}
            disabled={isPending}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
              topper?.recebido
                ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                : "bg-white border-gray-300 text-gray-500 hover:border-emerald-300 hover:text-emerald-600"
            }`}
          >
            {topper?.recebido ? (
              <CheckCircle2 size={12} />
            ) : (
              <Circle size={12} />
            )}
            Recebido
          </button>

          {totalFornecedor > 0 && (
            <button
              onClick={handleTogglePago}
              disabled={isPending}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                topper?.pago_fornecedor
                  ? "bg-orange-100 border-orange-300 text-orange-700"
                  : "bg-white border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {topper?.pago_fornecedor ? (
                <CheckCircle2 size={12} />
              ) : (
                <Circle size={12} />
              )}
              Pago ao fornecedor
            </button>
          )}
        </div>

        {/* Resumo financeiro quando há valores */}
        {totalFornecedor > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500 mb-0.5">Topper</p>
              <p className="text-xs font-semibold text-gray-800">
                {formatCurrency(topper?.valor ?? 0)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-[10px] text-gray-500 mb-0.5">Frete</p>
              <p className="text-xs font-semibold text-gray-800">
                {formatCurrency(topper?.frete ?? 0)}
              </p>
            </div>
            <div className="bg-brand-50 rounded-lg p-2">
              <p className="text-[10px] text-brand-600 mb-0.5">Total</p>
              <p className="text-xs font-bold text-brand-700">
                {formatCurrency(totalFornecedor)}
              </p>
            </div>
          </div>
        )}

        {/* Botão expandir/recolher */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} /> Recolher detalhes
            </>
          ) : (
            <>
              <ChevronDown size={14} /> Editar detalhes
            </>
          )}
        </button>
      </div>

      {/* Formulário expandível */}
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  R$
                </span>
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  R$
                </span>
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
            <p className="text-xs text-center text-brand-600 font-medium">
              Total a pagar ao fornecedor:{" "}
              <strong>
                {formatCurrency(
                  (parseFloat(valor) || 0) + (parseFloat(frete) || 0)
                )}
              </strong>
            </p>
          )}

          <div>
            <label className="label text-xs">Observações</label>
            <textarea
              className="input text-sm resize-none"
              rows={2}
              placeholder="Cor, tema, detalhes do pedido…"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 rounded p-2">{erro}</p>
          )}

          <button
            onClick={handleSalvar}
            disabled={isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
          >
            {salvoOk ? (
              <>
                <CheckCircle2 size={15} /> Salvo!
              </>
            ) : (
              <>
                <Save size={15} />
                {isPending ? "Salvando…" : "Salvar"}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function ToppersList({ pedidos }: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const totalToppers = pedidos.length;
  const totalAReceber = pedidos.filter(
    (p) => !(p.toppers_pedido as TopperPedido | null)?.recebido
  ).length;
  const totalAPagar = pedidos
    .filter((p) => {
      const t = p.toppers_pedido as TopperPedido | null;
      return t && !t.pago_fornecedor && (t.valor + t.frete) > 0;
    })
    .reduce((acc, p) => {
      const t = p.toppers_pedido as TopperPedido;
      return acc + t.valor + t.frete;
    }, 0);
  const totalJaPago = pedidos
    .filter((p) => {
      const t = p.toppers_pedido as TopperPedido | null;
      return t?.pago_fornecedor;
    })
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
    return true;
  });

  const filtros: { key: Filtro; label: string; count?: number }[] = [
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
      count: pedidos.filter((p) => {
        const t = p.toppers_pedido as TopperPedido | null;
        return t && !t.pago_fornecedor && (t.valor + t.frete) > 0;
      }).length,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalToppers}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pedidos com topper</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-orange-500">{totalAReceber}</p>
          <p className="text-xs text-gray-500 mt-0.5">Aguardando recebimento</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-red-500">{formatCurrency(totalAPagar)}</p>
          <p className="text-xs text-gray-500 mt-0.5">A pagar fornecedores</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalJaPago)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Já pago fornecedores</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filtros.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtro === key
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
            }`}
          >
            {label}
            {count !== undefined && (
              <span
                className={`text-[10px] px-1 rounded-full ${
                  filtro === key ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum topper encontrado para este filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map((pedido) => (
            <TopperCard key={pedido.id} pedido={pedido} />
          ))}
        </div>
      )}
    </div>
  );
}
