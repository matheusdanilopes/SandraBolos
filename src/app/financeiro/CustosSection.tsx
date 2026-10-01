"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, X, ChevronUp, AlertTriangle, Sparkles, ArrowRight } from "lucide-react";
import { adicionarCustoAction, excluirCustoAction } from "./actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { CustoComCategoria, CategoriaCusto } from "@/types/database";
import type { PeriodoRange } from "@/lib/periodo";
import { Chip, useCorte } from "./ListaFinanceira";

const BADGE_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
];

function badgeColor(nome: string) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) & 0xff;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Data que o formulário abre preenchida.
 *
 * Hoje, quando hoje cai dentro do período que está na tela. Fora dele o custo
 * lançado "hoje" sumia no instante em que era salvo — a lista só mostra o que
 * está no período —, e parecia que a gravação tinha falhado. Nesse caso abre no
 * último dia do período, que é onde o lançamento vai aparecer.
 */
function dataInicial(periodo: PeriodoRange) {
  const hoje = todayISO();
  return hoje >= periodo.inicio && hoje <= periodo.fim ? hoje : periodo.fim;
}

/** Resumo dos toppers que entra junto da lista de custos. */
export interface ResumoToppers {
  /** Pagos dentro do período — já somados ao custo do período. */
  pagosPeriodo: number;
  /** Dívida em aberto com fornecedores, de pedidos ativos. Não depende do período. */
  aPagar: number;
  quantidadeAPagar: number;
  /** Observações sobre toppers de pedidos cancelados, quando houver. */
  nota: string | null;
}

interface Props {
  custos: CustoComCategoria[];
  categorias: CategoriaCusto[];
  periodo: PeriodoRange;
  toppers: ResumoToppers;
}

const SEM_CATEGORIA = "Sem categoria";

export function CustosSection({ custos, categorias, periodo, toppers }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => dataInicial(periodo));
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [erro, setErro] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const foraDoPeriodo = data < periodo.inicio || data > periodo.fim;

  const porCategoria = custos.reduce<Record<string, number>>((acc, c) => {
    const cat = c.categorias_custo?.nome ?? SEM_CATEGORIA;
    acc[cat] = (acc[cat] ?? 0) + c.valor;
    return acc;
  }, {});
  const categoriaEntries = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  // O filtro some se a categoria escolhida deixou de existir (último custo dela excluído).
  const filtroAtivo = filtro && porCategoria[filtro] != null ? filtro : null;
  const custosVisiveis = filtroAtivo
    ? custos.filter((c) => (c.categorias_custo?.nome ?? SEM_CATEGORIA) === filtroAtivo)
    : custos;
  const { visiveis, controle } = useCorte(custosVisiveis);
  const mostrarToppers = toppers.pagosPeriodo > 0 || toppers.aPagar > 0 || toppers.nota;

  function handleAdicionar() {
    const descTrimmed = descricao.trim();
    const valorNum = parseFloat(valor);
    if (!descTrimmed) { setErro("Descrição obrigatória."); return; }
    if (!valor || isNaN(valorNum) || valorNum <= 0) { setErro("Informe um valor maior que zero."); return; }
    setErro("");
    startTransition(async () => {
      const res = await adicionarCustoAction(
        descTrimmed,
        valorNum,
        data,
        categoriaId || null
      );
      if (res.error) {
        setErro(res.error);
      } else {
        setDescricao("");
        setValor("");
        setData(dataInicial(periodo));
        setCategoriaId("");
        setShowForm(false);
      }
    });
  }

  function handleExcluir(id: string) {
    setErroExclusao("");
    startTransition(async () => {
      const res = await excluirCustoAction(id);
      // Antes o retorno era descartado: a falha de rede deixava o lançamento na
      // tela sem nenhum aviso, e o próximo toque tentava excluir de novo.
      if (res.error) setErroExclusao(res.error);
      else setConfirmandoExclusao(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400 min-w-0">
          {custos.length > 0
            ? `${custos.length} lançamento${custos.length !== 1 ? "s" : ""} no período`
            : periodo.label}
        </p>
        <button
          onClick={() => { setShowForm((v) => !v); setErro(""); if (!showForm) setData(dataInicial(periodo)); }}
          className={
            showForm
              ? "flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 px-2.5 py-1.5 transition-colors duration-200 flex-shrink-0"
              : "flex items-center gap-1.5 text-xs font-semibold bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors duration-200 flex-shrink-0"
          }
        >
          {showForm ? <><ChevronUp size={14} /> Fechar</> : <><Plus size={14} /> Lançar custo</>}
        </button>
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label text-xs">Descrição</label>
              <input
                type="text"
                className="input text-sm"
                placeholder="Ex: Farinha de trigo, Caixas…"
                value={descricao}
                onChange={(e) => { setDescricao(e.target.value); setErro(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAdicionar()}
                autoFocus
              />
            </div>
            <div>
              <label className="label text-xs">Valor (R$)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                className="input text-sm"
                placeholder="0,00"
                value={valor}
                onChange={(e) => { setValor(e.target.value); setErro(""); }}
              />
            </div>
            <div>
              <label className="label text-xs">Data</label>
              <input
                type="date"
                className="input text-sm"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Categoria</label>
              <select
                className="input text-sm"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Aviso, não bloqueio: lançar um gasto de outro mês é legítimo — o que
              não pode é ele sumir da tela sem explicação. */}
          {foraDoPeriodo && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700">
                Esta data está fora de {periodo.label}. O custo será salvo, mas só aparece ao
                escolher o período em que ele caiu.
              </p>
            </div>
          )}

          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <button
            onClick={handleAdicionar}
            disabled={isPending}
            className="btn-primary w-full text-sm flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            {isPending ? "Salvando…" : "Salvar custo"}
          </button>
        </div>
      )}

      {/* Toppers entram no custo do período, mas são geridos na tela própria. */}
      {mostrarToppers && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm text-gray-700">
              <Sparkles size={13} className="text-brand-400" />
              Toppers pagos no período
            </span>
            <span className="text-sm font-semibold tabular-nums text-rose-600">
              {formatCurrency(toppers.pagosPeriodo)}
            </span>
          </div>
          {toppers.aPagar > 0 && (
            <p className="text-xs text-gray-500">
              Ainda há <span className="font-semibold text-red-600">{formatCurrency(toppers.aPagar)}</span> a
              pagar aos fornecedores ({toppers.quantidadeAPagar} topper
              {toppers.quantidadeAPagar !== 1 ? "s" : ""}) — entra no custo quando for pago.
            </p>
          )}
          {toppers.nota && <p className="text-[11px] text-gray-400">{toppers.nota}</p>}
          <Link
            href="/toppers"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors duration-200"
          >
            Gerenciar toppers <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Categorias: o resumo de para onde foi o dinheiro e, ao mesmo tempo, o filtro da lista. */}
      {categoriaEntries.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4">
          <Chip ativo={filtroAtivo === null} onClick={() => setFiltro(null)}>
            Todas
          </Chip>
          {categoriaEntries.map(([cat, total]) => (
            <Chip
              key={cat}
              ativo={filtroAtivo === cat}
              onClick={() => setFiltro(filtroAtivo === cat ? null : cat)}
            >
              {cat} <span className="tabular-nums opacity-70">{formatCurrency(total)}</span>
            </Chip>
          ))}
        </div>
      )}

      {erroExclusao && <p className="text-xs text-red-600">{erroExclusao}</p>}

      {custos.length === 0 ? (
        <div className="text-center py-4 space-y-1">
          <p className="text-sm text-gray-400">Nenhum custo em {periodo.label}.</p>
          <p className="text-xs text-gray-300">Adicione ingredientes, embalagens e outros gastos.</p>
        </div>
      ) : (
        <div>
          <ul className="divide-y divide-gray-100">
            {visiveis.map((custo) => {
              const catNome = custo.categorias_custo?.nome ?? null;
              const confirmando = confirmandoExclusao === custo.id;
              return (
                <li key={custo.id} className="flex items-center gap-2 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{custo.descricao}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">{formatDate(custo.data)}</span>
                      {catNome && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeColor(catNome)}`}>
                          {catNome}
                        </span>
                      )}
                    </div>
                  </div>

                  {confirmando ? (
                    /* Um toque no × apagava o lançamento na hora, sem volta. No celular
                       esse alvo fica ao lado do valor e é fácil de acertar sem querer. */
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-gray-500">Excluir?</span>
                      <button
                        onClick={() => { setConfirmandoExclusao(null); setErroExclusao(""); }}
                        disabled={isPending}
                        className="text-xs font-medium text-gray-500 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Não
                      </button>
                      <button
                        onClick={() => handleExcluir(custo.id)}
                        disabled={isPending}
                        className="text-xs font-semibold text-white bg-red-600 px-2 py-1 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isPending ? "…" : "Sim"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold tabular-nums text-rose-600 flex-shrink-0">
                        {formatCurrency(custo.valor)}
                      </span>
                      <button
                        onClick={() => { setConfirmandoExclusao(custo.id); setErroExclusao(""); }}
                        disabled={isPending}
                        className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                        aria-label={`Excluir custo ${custo.descricao}`}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {controle}
        </div>
      )}
    </div>
  );
}
