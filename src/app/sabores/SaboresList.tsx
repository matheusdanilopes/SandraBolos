"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deletarSaborAction } from "./actions";
import {
  TIPO_SABOR_LABELS,
  type Sabor,
  type TipoSabor,
} from "@/types/database";
import { Edit, Trash2, Search, AlertTriangle } from "lucide-react";

type Filtro = "todos" | TipoSabor | "inativos";

const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "bolo", label: "Bolo" },
  { value: "doce", label: "Doce" },
  { value: "ambos", label: "Bolo e Doce" },
  { value: "inativos", label: "Inativos" },
];

const TIPO_COLORS: Record<TipoSabor, string> = {
  bolo: "bg-brand-100 text-brand-700",
  doce: "bg-pink-100 text-pink-700",
  ambos: "bg-purple-100 text-purple-700",
};

function ConfirmDelete({
  sabor,
  onConfirm,
  onCancel,
  isPending,
}: {
  sabor: Sabor;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800">
          Excluir <span className="font-semibold">"{sabor.nome}"</span>?
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isPending}
          className="btn-secondary flex-1 text-sm py-1.5"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? "Excluindo..." : "Sim, excluir"}
        </button>
      </div>
    </div>
  );
}

export function SaboresList({ sabores }: { sabores: Sabor[] }) {
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const filtered = sabores.filter((s) => {
    if (busca && !s.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtro === "inativos") return !s.ativo;
    if (filtro === "todos") return s.ativo;
    return s.ativo && s.tipo === filtro;
  });

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletarSaborAction(id);
      setConfirmandoId(null);
    });
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar sabor..."
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
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">{filtered.length} sabor{filtered.length !== 1 ? "es" : ""}</p>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          Nenhum sabor encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sabor) =>
            confirmandoId === sabor.id ? (
              <ConfirmDelete
                key={sabor.id}
                sabor={sabor}
                onConfirm={() => handleDelete(sabor.id)}
                onCancel={() => setConfirmandoId(null)}
                isPending={isPending}
              />
            ) : (
              <div
                key={sabor.id}
                className={`card p-3 flex items-center gap-3 ${!sabor.ativo ? "opacity-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{sabor.nome}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TIPO_COLORS[sabor.tipo as TipoSabor]}`}>
                      {TIPO_SABOR_LABELS[sabor.tipo as TipoSabor]}
                    </span>
                    {!sabor.ativo && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link
                    href={`/sabores/${sabor.id}/editar`}
                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <Edit size={15} />
                  </Link>
                  <button
                    onClick={() => setConfirmandoId(sabor.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
