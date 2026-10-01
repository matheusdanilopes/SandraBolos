"use client";

import { useState, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CustoComCategoria, CategoriaCusto } from "@/types/database";
import type { PeriodoRange } from "@/lib/periodo";
import { Chip, ListaFinanceira, type LinhaFinanceira } from "./ListaFinanceira";
import { CustosSection, type ResumoToppers } from "./CustosSection";

export type Aba = "entregas" | "receber" | "custos" | "cancelados";

interface Props {
  abaInicial: Aba;
  periodo: PeriodoRange;
  entregas: { linhas: LinhaFinanceira[]; total: number };
  aReceber: { linhas: LinhaFinanceira[]; total: number };
  custos: {
    itens: CustoComCategoria[];
    categorias: CategoriaCusto[];
    /** Custos lançados + toppers pagos no período. */
    total: number;
    toppers: ResumoToppers;
  };
  cancelados: { linhas: LinhaFinanceira[]; valorPerdido: number };
}

/**
 * As listas do financeiro numa área só, uma de cada vez.
 *
 * Antes cada lista era um bloco empilhado (custos, a receber, entregas,
 * cancelados) e, num período longo, a tela virava uma rolagem sem fim até
 * chegar em toppers e na evolução mensal. Nas abas o total de cada grupo fica
 * sempre à vista, e só a lista escolhida ocupa espaço.
 */
export function PainelMovimentacoes({ abaInicial, periodo, entregas, aReceber, custos, cancelados }: Props) {
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [soSemValor, setSoSemValor] = useState(false);

  const entregasSemValor = entregas.linhas.filter((l) => l.valor == null);
  const receberSemValor = aReceber.linhas.filter((l) => l.valor == null).length;

  const abas: { id: Aba; rotulo: string; valor: string; cor: string; alerta?: boolean }[] = [
    {
      id: "entregas",
      rotulo: "Entregas",
      valor: formatCurrency(entregas.total),
      cor: "text-emerald-600",
      alerta: entregasSemValor.length > 0,
    },
    { id: "receber", rotulo: "A receber", valor: formatCurrency(aReceber.total), cor: "text-blue-600" },
    { id: "custos", rotulo: "Custos", valor: formatCurrency(custos.total), cor: "text-rose-600" },
  ];
  if (cancelados.linhas.length > 0) {
    abas.push({
      id: "cancelados",
      rotulo: "Cancelados",
      valor: String(cancelados.linhas.length),
      cor: "text-gray-500",
    });
  }

  return (
    <section className="card overflow-hidden" aria-label="Movimentações">
      <div role="tablist" className="flex overflow-x-auto scrollbar-none border-b border-gray-100 bg-gray-50/60">
        {abas.map((a) => {
          const ativa = aba === a.id;
          return (
            <button
              key={a.id}
              role="tab"
              id={`aba-${a.id}`}
              aria-selected={ativa}
              aria-controls={`painel-${a.id}`}
              onClick={() => setAba(a.id)}
              className={`relative flex-1 min-w-[76px] flex flex-col items-center gap-0.5 px-2 pt-2.5 pb-2 border-b-2 -mb-px transition-colors duration-200 ${
                ativa ? "border-brand-600 bg-white" : "border-transparent hover:bg-white/70"
              }`}
            >
              <span className={`text-[11px] font-medium whitespace-nowrap ${ativa ? "text-gray-900" : "text-gray-500"}`}>
                {a.rotulo}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums whitespace-nowrap ${ativa ? a.cor : "text-gray-400"}`}
              >
                {a.valor}
              </span>
              {a.alerta && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-orange-400" aria-label="há entregas sem valor" />
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`} className="p-4 space-y-3">
        {aba === "entregas" && (
          <>
            <Resumo>
              {entregas.linhas.length} entrega{entregas.linhas.length !== 1 ? "s" : ""} em {periodo.label}
            </Resumo>

            {entregasSemValor.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <Chip ativo={!soSemValor} onClick={() => setSoSemValor(false)}>
                    Todas
                  </Chip>
                  <Chip ativo={soSemValor} onClick={() => setSoSemValor(true)} alerta>
                    <AlertCircle size={11} />
                    {entregasSemValor.length} sem valor
                  </Chip>
                </div>
                {/* Receita que existiu e não foi contada: a receita e o ticket ficam menores que o real. */}
                {soSemValor && (
                  <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                    Estas entregas não têm o valor cobrado registrado, então a receita e o ticket médio
                    estão menores do que o real. Abra cada pedido e informe o valor.
                  </p>
                )}
              </div>
            )}

            <ListaFinanceira
              key={soSemValor ? "sem-valor" : "todas"}
              linhas={soSemValor ? entregasSemValor : entregas.linhas}
              corValor="text-emerald-600"
              mostrarSinal
              vazio={`Nenhuma entrega em ${periodo.label}.`}
            />
          </>
        )}

        {aba === "receber" && (
          <>
            {/* Sem esta linha a conta não fecha: soma-se "a receber" à receita do
                período e o total não bate com nada que a tela mostra. */}
            <Resumo>
              Pedidos prontos esperando entrega — não depende do período
              {receberSemValor > 0 && (
                <span className="text-orange-500"> · {receberSemValor} sem valor</span>
              )}
            </Resumo>
            <ListaFinanceira
              linhas={aReceber.linhas}
              corValor="text-blue-600"
              vazio="Nenhum pedido pronto aguardando entrega."
            />
          </>
        )}

        {aba === "custos" && (
          <CustosSection
            custos={custos.itens}
            categorias={custos.categorias}
            periodo={periodo}
            toppers={custos.toppers}
          />
        )}

        {aba === "cancelados" && (
          <>
            {/* Todos os números da tela ignoram o cancelado. Sem dizer isso, um mês
                com cancelamentos parece só um mês fraco, e não dá para saber se o
                app descontou ou esqueceu de contar. */}
            <Resumo>
              Fora de todos os números de {periodo.label}
              {cancelados.valorPerdido > 0 &&
                ` · ${formatCurrency(cancelados.valorPerdido)} deixaram de entrar`}
            </Resumo>
            <ListaFinanceira
              linhas={cancelados.linhas}
              corValor="text-gray-400 line-through"
              vazio="Nenhum pedido cancelado no período."
            />
          </>
        )}
      </div>
    </section>
  );
}

function Resumo({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-400">{children}</p>;
}
