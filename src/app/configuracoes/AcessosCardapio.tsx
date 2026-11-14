"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";

export interface AcessosCardapioDados {
  total: number;
  // Um item por dia (AAAA-MM-DD, horário de Brasília), do mais antigo para hoje
  porDia: { dia: string; total: number }[];
}

function formatarDia(dia: string) {
  const [, mes, d] = dia.split("-");
  return `${d}/${mes}`;
}

export function AcessosCardapio({ acessos }: { acessos: AcessosCardapioDados | null }) {
  const [selecionado, setSelecionado] = useState<number | null>(null);

  if (!acessos) {
    return (
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        A contagem de acessos ainda não está ativa: rode a migration{" "}
        <code>016_add_cardapio_acessos.sql</code> no SQL Editor do Supabase.
      </p>
    );
  }

  const { total, porDia } = acessos;
  const ultimos7 = porDia.slice(-7).reduce((s, d) => s + d.total, 0);
  const ultimos30 = porDia.reduce((s, d) => s + d.total, 0);
  const maximo = Math.max(1, ...porDia.map((d) => d.total));
  const indiceAtivo = selecionado ?? porDia.length - 1;
  const ativo = porDia[indiceAtivo];

  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 size={14} className="text-brand-600" />
        <p className="text-sm font-medium text-gray-700">Acessos pelo link</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { rotulo: "Hoje", valor: porDia[porDia.length - 1]?.total ?? 0 },
          { rotulo: "7 dias", valor: ultimos7 },
          { rotulo: "30 dias", valor: ultimos30 },
        ].map((k) => (
          <div key={k.rotulo} className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-[11px] text-gray-500">{k.rotulo}</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">{k.valor}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-600 mb-1 h-4">
          {ativo && (
            <>
              <span className="font-medium">{formatarDia(ativo.dia)}</span>:{" "}
              {ativo.total} {ativo.total === 1 ? "acesso" : "acessos"}
            </>
          )}
        </p>
        <div
          className="flex items-end gap-[2px] h-24"
          role="img"
          aria-label={`Acessos por dia nos últimos ${porDia.length} dias`}
          onMouseLeave={() => setSelecionado(null)}
        >
          {porDia.map((d, i) => (
            <button
              key={d.dia}
              type="button"
              onMouseEnter={() => setSelecionado(i)}
              onClick={() => setSelecionado(i)}
              title={`${formatarDia(d.dia)}: ${d.total}`}
              className="flex-1 h-full flex items-end"
            >
              <span
                className={`w-full rounded-t-sm ${
                  i === indiceAtivo ? "bg-brand-600" : "bg-brand-300"
                }`}
                style={{ height: d.total === 0 ? "2px" : `${Math.max(4, (d.total / maximo) * 100)}%` }}
              />
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{formatarDia(porDia[0].dia)}</span>
          <span>Hoje</span>
        </div>
      </div>

      <p className="text-[11px] text-gray-400">
        Total desde o início da contagem: {total}. Prévias de link geradas pelo WhatsApp e Instagram não contam.
      </p>
    </div>
  );
}
