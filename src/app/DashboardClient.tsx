"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDate, isEntregaHoje, pedidoAlerta } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { TIPO_LABELS, type PedidoComCliente } from "@/types/database";
import { Package, Loader, CheckCircle, AlertTriangle, X } from "lucide-react";

type Filtro = "todos" | "hoje" | "produzindo" | "feito" | "atrasados";

const FILTRO_LABELS: Record<Filtro, string> = {
  todos: "Pedidos Ativos",
  hoje: "Entregas de Hoje",
  produzindo: "Em Produção",
  feito: "Prontos para Entregar",
  atrasados: "Atrasados",
};

export function DashboardClient({ pedidos }: { pedidos: PedidoComCliente[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const grupos = {
    hoje: pedidos.filter((p) => isEntregaHoje(p.data_entrega)),
    produzindo: pedidos.filter((p) => p.status === "produzindo"),
    feito: pedidos.filter((p) => p.status === "feito"),
    atrasados: pedidos.filter((p) => pedidoAlerta(p.data_entrega) === "atrasado"),
  };

  const filtrados =
    filtro === "hoje" ? grupos.hoje
    : filtro === "produzindo" ? grupos.produzindo
    : filtro === "feito" ? grupos.feito
    : filtro === "atrasados" ? grupos.atrasados
    : pedidos;

  function toggleFiltro(f: Filtro) {
    setFiltro((prev) => (prev === f ? "todos" : f));
  }

  return (
    <div className="space-y-4">
      {/* Stat cards — each is a filter toggle */}
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
          <div className="card p-8 text-center text-gray-400">
            <CheckCircle size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum pedido</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((pedido) => (
              <Link
                key={pedido.id}
                href={`/pedidos/${pedido.id}`}
                className="card p-3 block hover:shadow-md transition-shadow active:bg-gray-50"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {pedido.clientes?.nome ?? "Sem cliente"}
                  </span>
                  <StatusBadge status={pedido.status} />
                  <AlertaBadge dataEntrega={pedido.data_entrega} status={pedido.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{TIPO_LABELS[pedido.tipo]}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">Entrega: {formatDate(pedido.data_entrega)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
