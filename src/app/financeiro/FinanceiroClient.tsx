"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TIPO_LABELS } from "@/types/database";
import { ChevronLeft, ChevronRight, TrendingUp, Package, DollarSign, Clock } from "lucide-react";

type PedidoEntregue = {
  id: string;
  data_entrega: string;
  valor_cobrado: number | null;
  tipo: string;
  clientes: { nome: string } | null;
};

type PedidoAtivo = {
  preco_corrigido: number | null;
  valor_calculado: number | null;
};

interface Props {
  pedidosEntregues: PedidoEntregue[];
  pedidosAtivos: PedidoAtivo[];
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color.replace("text-", "bg-").replace("-600", "-50").replace("-700", "-50")}`}>
          <Icon size={16} className={color} />
        </div>
      </div>
    </div>
  );
}

export function FinanceiroClient({ pedidosEntregues, pedidosAtivos }: Props) {
  const [mesRef, setMesRef] = useState(() => new Date());

  const inicio = startOfMonth(mesRef);
  const fim = endOfMonth(mesRef);

  const pedidosMes = useMemo(
    () =>
      pedidosEntregues.filter((p) =>
        isWithinInterval(parseISO(p.data_entrega), { start: inicio, end: fim })
      ),
    [pedidosEntregues, mesRef]
  );

  const faturado = pedidosMes.reduce((s, p) => s + (p.valor_cobrado ?? 0), 0);
  const count = pedidosMes.length;
  const ticketMedio = count > 0 ? faturado / count : 0;
  const aReceber = pedidosAtivos.reduce(
    (s, p) => s + (p.preco_corrigido ?? p.valor_calculado ?? 0),
    0
  );

  const mesLabel = format(mesRef, "MMMM yyyy", { locale: ptBR });
  const isCurrentMonth =
    format(mesRef, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="card flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setMesRef((m) => subMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800 capitalize">{mesLabel}</p>
          {isCurrentMonth && (
            <p className="text-[10px] text-brand-600 font-medium">Mês atual</p>
          )}
        </div>
        <button
          onClick={() => setMesRef((m) => addMonths(m, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          disabled={isCurrentMonth}
        >
          <ChevronRight size={18} className={isCurrentMonth ? "opacity-30" : ""} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Faturado no mês"
          value={formatCurrency(faturado)}
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatCard
          label="Pedidos entregues"
          value={String(count)}
          icon={Package}
          color="text-brand-600"
        />
        <StatCard
          label="Ticket médio"
          value={count > 0 ? formatCurrency(ticketMedio) : "—"}
          icon={DollarSign}
          color="text-yellow-600"
        />
        <StatCard
          label="A receber"
          value={aReceber > 0 ? formatCurrency(aReceber) : "—"}
          sub="pedidos em aberto"
          icon={Clock}
          color="text-orange-600"
        />
      </div>

      {/* Transaction list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Entregas do mês
          <span className="text-gray-400 font-normal ml-1">({count})</span>
        </h2>

        {pedidosMes.length === 0 ? (
          <div className="card p-8 text-center text-gray-400 text-sm">
            Nenhuma entrega neste mês
          </div>
        ) : (
          <div className="space-y-2">
            {pedidosMes.map((p) => (
              <Link
                key={p.id}
                href={`/pedidos/${p.id}`}
                className="card p-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow active:bg-gray-50 block"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.clientes?.nome ?? "Sem cliente"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {TIPO_LABELS[p.tipo as keyof typeof TIPO_LABELS]} · {formatDate(p.data_entrega)}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold flex-shrink-0 ${
                    p.valor_cobrado ? "text-green-600" : "text-gray-300"
                  }`}
                >
                  {p.valor_cobrado ? formatCurrency(p.valor_cobrado) : "—"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Monthly total footer */}
      {faturado > 0 && (
        <div className="card p-3 bg-green-50 border-green-200 flex items-center justify-between">
          <span className="text-sm font-medium text-green-800">Total faturado</span>
          <span className="text-base font-bold text-green-700">{formatCurrency(faturado)}</span>
        </div>
      )}
    </div>
  );
}
