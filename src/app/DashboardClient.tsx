"use client";

import Link from "next/link";
import { useMemo } from "react";
import { pedidoAlerta, formatCurrency } from "@/lib/utils";
import { type PedidoCalendario, type PedidoComCliente } from "@/types/database";
import { DashboardCalendario } from "./DashboardCalendario";
import { DashboardResumo } from "./DashboardResumo";
import { resumoDaSemana, resumoDeHoje } from "@/lib/resumoDashboard";
import {
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
  pedidosCalendario: PedidoCalendario[];
}

export function DashboardClient({
  pedidos,
  receitaPeriodo,
  periodoLabel,
  aReceber,
  pedidosCalendario,
}: Props) {
  const rascunhos = useMemo(() => pedidos.filter((p) => p.status === "rascunho"), [pedidos]);
  const pedidosAtivos = useMemo(() => pedidos.filter((p) => p.status !== "rascunho"), [pedidos]);

  const atrasados = useMemo(
    () =>
      pedidosAtivos.filter(
        (p) =>
          pedidoAlerta(p.data_entrega, p.hora_entrega, p.hora_retirada) === "atrasado" &&
          p.status !== "entregue"
      ).length,
    [pedidosAtivos]
  );

  const resumoHoje = useMemo(
    () => resumoDeHoje(pedidosAtivos, pedidosCalendario),
    [pedidosAtivos, pedidosCalendario]
  );

  const resumoSemana = useMemo(
    () => resumoDaSemana(pedidosAtivos, pedidosCalendario),
    [pedidosAtivos, pedidosCalendario]
  );

  return (
    <div className="space-y-5">
      {/* Atrasados vêm antes de tudo: é o único indicador que pede ação agora */}
      {atrasados > 0 && (
        <Link
          href="/pedidos?filtro=atrasados"
          className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl transition-colors hover:bg-red-100 active:bg-red-200"
        >
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">
              {atrasados} pedido{atrasados !== 1 ? "s" : ""} atrasado{atrasados !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600 mt-0.5">Toque para ver a lista</p>
          </div>
          <ChevronRight size={16} className="text-red-400 flex-shrink-0" />
        </Link>
      )}

      {/* Resumo de hoje e da semana */}
      <DashboardResumo hoje={resumoHoje} semana={resumoSemana} />

      {/* Indicador de rascunhos */}
      {rascunhos.length > 0 && (
        <Link
          href="/pedidos?filtro=rascunho"
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
            <span className="truncate">{periodoLabel}</span>
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

      {/* Calendário de entregas */}
      <DashboardCalendario pedidos={pedidosCalendario} />
    </div>
  );
}
