"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Uma linha de pedido dentro dos blocos do financeiro (a receber, entregas,
 * cancelados). O servidor já entrega o texto pronto — aqui só sobra mostrar.
 */
export interface LinhaFinanceira {
  id: string;
  titulo: string;
  detalhe: string;
  valor: number | null;
  /** O que aparece no lugar do valor quando ele não foi registrado. */
  semValor: string;
}

interface Props {
  linhas: LinhaFinanceira[];
  /** Cor do valor — cada bloco tem a sua (a receber é azul, entregue é verde). */
  corValor: string;
  /** Marca com ✓/! se o valor está registrado. Só faz sentido no que já foi entregue. */
  mostrarSinal?: boolean;
  /** Quantas linhas aparecem antes do "ver todos". */
  limite?: number;
}

const LIMITE_PADRAO = 8;

/**
 * Listas do financeiro com corte.
 *
 * Num período de 6 meses ou de um ano inteiro essas listas passam de cem linhas,
 * e tudo que vem depois delas na tela (toppers, evolução mensal) ficava a uma
 * rolagem longa de distância no celular. O corte mostra o começo e deixa o resto
 * a um toque — sem tirar nada de vista.
 */
export function ListaFinanceira({ linhas, corValor, mostrarSinal = false, limite = LIMITE_PADRAO }: Props) {
  const [expandido, setExpandido] = useState(false);

  const temCorte = linhas.length > limite;
  const visiveis = temCorte && !expandido ? linhas.slice(0, limite) : linhas;
  const ocultas = linhas.length - visiveis.length;

  return (
    <div className="space-y-1">
      {visiveis.map((linha) => (
        <Link
          key={linha.id}
          href={`/pedidos/${linha.id}`}
          className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded transition-colors"
        >
          <div className="flex items-start gap-2 min-w-0">
            {mostrarSinal &&
              (linha.valor != null ? (
                <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle size={14} className="text-orange-400 mt-0.5 flex-shrink-0" />
              ))}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{linha.titulo}</p>
              <p className="text-xs text-gray-400">{linha.detalhe}</p>
            </div>
          </div>
          {linha.valor != null ? (
            <span className={`text-sm font-semibold flex-shrink-0 ${corValor}`}>
              {formatCurrency(linha.valor)}
            </span>
          ) : (
            <span className="text-xs text-orange-500 font-medium flex-shrink-0">{linha.semValor}</span>
          )}
        </Link>
      ))}

      {temCorte && (
        <button
          onClick={() => setExpandido((v) => !v)}
          className="w-full flex items-center justify-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 py-2 transition-colors"
        >
          {expandido ? (
            <>Mostrar menos <ChevronDown size={12} className="rotate-180" /></>
          ) : (
            <>Ver os {ocultas} restantes <ChevronDown size={12} /></>
          )}
        </button>
      )}
    </div>
  );
}
