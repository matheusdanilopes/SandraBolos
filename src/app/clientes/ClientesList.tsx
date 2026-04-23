"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Phone, ChevronRight } from "lucide-react";
import { formatPhone } from "@/lib/utils";
import type { Cliente } from "@/types/database";

export function ClientesList({ clientes }: { clientes: Cliente[] }) {
  const [busca, setBusca] = useState("");

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input pl-9"
        />
      </div>

      <p className="text-xs text-gray-500">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">Nenhum cliente encontrado</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cliente) => (
            <Link key={cliente.id} href={`/clientes/${cliente.id}`} className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
                {cliente.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">{cliente.nome}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={10} /> {formatPhone(cliente.telefone)}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
