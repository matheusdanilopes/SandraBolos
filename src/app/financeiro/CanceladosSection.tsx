"use client";

import { useState } from "react";
import { ChevronDown, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ListaFinanceira, type LinhaFinanceira } from "./ListaFinanceira";

interface Props {
  linhas: LinhaFinanceira[];
  /** Soma do que esses pedidos valeriam se tivessem sido entregues. */
  valorPerdido: number;
  periodoLabel: string;
}

/**
 * Pedidos cancelados do período — mostrados justamente por ficarem de fora.
 *
 * Todos os números desta tela ignoram o cancelado (receita, a receber, ticket,
 * lucro). Sem nada na tela dizendo isso, um mês com dois cancelamentos parece
 * simplesmente um mês fraco, e não dá para saber se o app descontou ou se
 * esqueceu de contar. O bloco nasce fechado: é informação de conferência, não
 * mais um número para acompanhar.
 */
export function CanceladosSection({ linhas, valorPerdido, periodoLabel }: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="card p-4 space-y-3">
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center gap-2 text-left"
        aria-expanded={aberto}
      >
        <XCircle size={15} className="text-red-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-gray-700">
            {linhas.length} pedido{linhas.length !== 1 ? "s" : ""} cancelado
            {linhas.length !== 1 ? "s" : ""}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Fora dos números de {periodoLabel}
            {valorPerdido > 0 && ` · ${formatCurrency(valorPerdido)} que deixaram de entrar`}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400 pt-2">
            Nenhum destes entra na receita, no ticket médio, no lucro nem no que há a receber.
          </p>
          <ListaFinanceira linhas={linhas} corValor="text-gray-400 line-through" />
        </div>
      )}
    </div>
  );
}
