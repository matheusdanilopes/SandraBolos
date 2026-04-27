"use client";

import { useState, useTransition } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { adicionarCustoAction, excluirCustoAction } from "./actions";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { CustoComCategoria, CategoriaCusto } from "@/types/database";

// Paleta de cores para badges de categoria (hash pelo nome)
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

interface Props {
  custos: CustoComCategoria[];
  categorias: CategoriaCusto[];
}

export function CustosSection({ custos, categorias }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(todayISO());
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalMes = custos.reduce((acc, c) => acc + c.valor, 0);

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
        setData(todayISO());
        setCategoriaId("");
        setShowForm(false);
      }
    });
  }

  function handleExcluir(id: string) {
    startTransition(async () => {
      await excluirCustoAction(id);
    });
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-700">Custos do Mês</h2>
        <div className="flex items-center gap-3">
          {totalMes > 0 && (
            <span className="text-sm font-bold text-rose-600">{formatCurrency(totalMes)}</span>
          )}
          <button
            onClick={() => { setShowForm((v) => !v); setErro(""); }}
            className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            {showForm ? <><ChevronUp size={14} /> Fechar</> : <><Plus size={14} /> Adicionar</>}
          </button>
        </div>
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
              />
            </div>
            <div>
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
            <div>
              <label className="label text-xs">Valor (R$)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input text-sm"
                placeholder="0,00"
                value={valor}
                onChange={(e) => { setValor(e.target.value); setErro(""); }}
              />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">Data</label>
              <input
                type="date"
                className="input text-sm"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>
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

      {/* Lista de custos */}
      {custos.length === 0 ? (
        <div className="text-center py-4 space-y-1">
          <p className="text-sm text-gray-400">Nenhum custo registrado este mês.</p>
          <p className="text-xs text-gray-300">Adicione ingredientes, embalagens e outros gastos.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {custos.map((custo) => {
            const catNome = custo.categorias_custo?.nome ?? null;
            return (
              <div
                key={custo.id}
                className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm text-gray-800 font-medium truncate">{custo.descricao}</span>
                    {catNome && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeColor(catNome)}`}>
                        {catNome}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(custo.data)}</span>
                </div>
                <span className="text-sm font-semibold text-rose-600 flex-shrink-0">
                  {formatCurrency(custo.valor)}
                </span>
                <button
                  onClick={() => handleExcluir(custo.id)}
                  disabled={isPending}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                  aria-label="Excluir custo"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
