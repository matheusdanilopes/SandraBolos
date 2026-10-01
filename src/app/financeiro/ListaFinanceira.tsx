"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Uma linha de pedido dentro das abas do financeiro (entregas, a receber,
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

const INICIAL = 6;
const PASSO = 15;

/**
 * Corte progressivo das listas do financeiro.
 *
 * Num período de 6 meses ou de um ano essas listas passam de cem linhas. Abrir
 * tudo de uma vez com um toque trocava um problema pelo outro: a tela voltava a
 * ficar quilométrica. Agora a lista começa curta e cresce aos poucos.
 */
export function useCorte<T>(itens: T[], inicial = INICIAL) {
  const [limite, setLimite] = useState(inicial);
  const visiveis = itens.slice(0, limite);
  const restantes = itens.length - visiveis.length;

  return {
    visiveis,
    controle:
      itens.length > inicial ? (
        <button
          type="button"
          onClick={() => setLimite(restantes > 0 ? limite + PASSO : inicial)}
          className="w-full flex items-center justify-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg py-2 mt-1 transition-colors duration-200"
        >
          {restantes > 0 ? (
            <>
              Ver mais {Math.min(PASSO, restantes)}
              <span className="text-gray-400 font-normal">de {restantes}</span>
              <ChevronDown size={12} />
            </>
          ) : (
            <>Mostrar menos <ChevronDown size={12} className="rotate-180" /></>
          )}
        </button>
      ) : null,
  };
}

interface Props {
  linhas: LinhaFinanceira[];
  /** Cor do valor — cada aba tem a sua (a receber é azul, entregue é verde). */
  corValor: string;
  /** Marca com ✓/! se o valor está registrado. Só faz sentido no que já foi entregue. */
  mostrarSinal?: boolean;
  /** Texto quando a lista está vazia. */
  vazio: string;
}

export function ListaFinanceira({ linhas, corValor, mostrarSinal = false, vazio }: Props) {
  const { visiveis, controle } = useCorte(linhas);

  if (linhas.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">{vazio}</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {visiveis.map((linha) => (
          <li key={linha.id}>
            <Link
              href={`/pedidos/${linha.id}`}
              className="flex items-center justify-between gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
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
                <span className={`text-sm font-semibold tabular-nums flex-shrink-0 ${corValor}`}>
                  {formatCurrency(linha.valor)}
                </span>
              ) : (
                <span className="text-xs text-orange-500 font-medium flex-shrink-0">{linha.semValor}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      {controle}
    </div>
  );
}

/** Botão de filtro em formato de pílula, usado nas abas do financeiro. */
export function Chip({
  ativo,
  alerta = false,
  onClick,
  children,
}: {
  ativo: boolean;
  alerta?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const cores = ativo
    ? alerta
      ? "bg-orange-500 border-orange-500 text-white"
      : "bg-gray-800 border-gray-800 text-white"
    : alerta
      ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex-shrink-0 flex items-center gap-1 whitespace-nowrap text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors duration-200 ${cores}`}
    >
      {children}
    </button>
  );
}
