"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { formatDate, isEntregaHoje, isEntregaSemana, pedidoAlerta } from "@/lib/utils";
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

export function PedidosList({ pedidos }: { pedidos: PedidoComCliente[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const filtered = pedidos.filter((p) => {
    const nome = p.clientes?.nome?.toLowerCase() ?? "";
    if (busca && !nome.includes(busca.toLowerCase())) return false;

    switch (filtro) {
      case "hoje": return isEntregaHoje(p.data_entrega);
      case "semana": return isEntregaSemana(p.data_entrega);
      case "atrasados": return pedidoAlerta(p.data_entrega) === "atrasado" && p.status !== "entregue";
      case "todos": return true;
      default: return p.status === filtro;
    }
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
          className="input pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTROS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFiltro(value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filtro === value
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}</p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">Nenhum pedido encontrado</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((pedido) => (
            <Link
              key={pedido.id}
              href={`/pedidos/${pedido.id}`}
              className="card p-3 block hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">
                      {pedido.clientes?.nome ?? "Sem cliente"}
                    </span>
                    <StatusBadge status={pedido.status} />
                    <AlertaBadge dataEntrega={pedido.data_entrega} status={pedido.status} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{TIPO_LABELS[pedido.tipo]}</span>
                    {pedido.peso && <span>{pedido.peso}kg</span>}
                    {pedido.quantidade && <span>{pedido.quantidade} un.</span>}
                    <span>Entrega: {formatDate(pedido.data_entrega)}</span>
                  </div>
                  {pedido.descricao && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{pedido.descricao}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
