"use client";

import Link from "next/link";
import {
  isEntregaHoje,
  pedidoAlerta,
  formatCurrency,
} from "@/lib/utils";
import {
  type PedidoComCliente,
} from "@/types/database";
import {
  Package,
  Loader,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Banknote,
  FileEdit,
  ChevronRight,
} from "lucide-react";

interface Props {
  pedidos: PedidoComCliente[];
  receitaPeriodo: number;
  periodoLabel: string;
  aReceber: number;
}

export function DashboardClient({ pedidos, receitaPeriodo, periodoLabel, aReceber }: Props) {
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

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-brand-50 rounded-lg">
              <Package size={16} className="text-brand-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-600 leading-none">{grupos.hoje.length}</div>
          <div className="text-xs text-gray-500 mt-1">Entregas Hoje</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-yellow-50 rounded-lg">
              <Loader size={16} className="text-yellow-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-yellow-600 leading-none">{grupos.produzindo.length}</div>
          <div className="text-xs text-gray-500 mt-1">Produzindo</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-green-50 rounded-lg">
              <CheckCircle size={16} className="text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600 leading-none">{grupos.feito.length}</div>
          <div className="text-xs text-gray-500 mt-1">Prontos</div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-1.5 bg-red-50 rounded-lg">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            {grupos.atrasados.length > 0 && (
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">{grupos.atrasados.length}</span>
            )}
          </div>
          <div className="text-2xl font-bold text-red-600 leading-none">{grupos.atrasados.length}</div>
          <div className="text-xs text-gray-500 mt-1">Atrasados</div>
        </div>
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
    </div>
  );
}
