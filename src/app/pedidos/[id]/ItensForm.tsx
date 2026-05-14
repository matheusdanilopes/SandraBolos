"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Package, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Produto, ItemPedido, UnidadeMedida } from "@/types/database";
import { UNIDADE_LABELS } from "@/types/database";
import { adicionarItemAction, removerItemAction } from "./itensActions";

// ─── Cálculo por unidade de medida ──────────────────────────────────────────

function calcularTotal(
  quantidade: number,
  precoUnitario: number,
  unidade: UnidadeMedida
): number {
  switch (unidade) {
    case "peso_kg":
      // decimal × valor/kg  (ex: 1,5 kg × R$80 = R$120)
      return Math.round(quantidade * precoUnitario * 100) / 100;
    case "cento":
      // proporcional ao cento  (ex: 50 un. = 0,5 × R$80 = R$40)
      return Math.round((quantidade / 100) * precoUnitario * 100) / 100;
    case "unidade":
      // inteiro × valor unitário
      return Math.round(Math.round(quantidade) * precoUnitario * 100) / 100;
  }
}

function formatQuantidadeItem(quantidade: number, unidade: UnidadeMedida): string {
  if (unidade === "peso_kg") return `${quantidade.toFixed(3)} kg`;
  return `${Math.round(quantidade)} un.`;
}

// ─── Configuração de input por unidade ───────────────────────────────────────

function quantidadeInputConfig(unidade: UnidadeMedida) {
  if (unidade === "peso_kg") {
    return {
      step: "0.001",
      min: "0.001",
      label: "Quantidade (kg)",
      placeholder: "Ex: 1,500",
    };
  }
  return {
    step: "1",
    min: "1",
    label: unidade === "cento" ? "Quantidade (unidades avulsas)" : "Quantidade",
    placeholder: unidade === "cento" ? "Ex: 50" : "Ex: 10",
  };
}

function precoLabel(unidade: UnidadeMedida): string {
  if (unidade === "peso_kg") return "Preço/kg (R$)";
  if (unidade === "cento") return "Preço do cento (R$)";
  return "Preço unitário (R$)";
}

// ─── Linha de item salvo ──────────────────────────────────────────────────────

function ItemRow({
  item,
  onRemover,
  disabled,
}: {
  item: ItemPedido;
  onRemover: (id: string) => void;
  disabled: boolean;
}) {
  const centoFator =
    item.unidade_medida === "cento"
      ? (item.quantidade / 100).toFixed(2)
      : null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.nome_produto}</p>
        <p className="text-[11px] text-gray-500">
          {formatQuantidadeItem(item.quantidade, item.unidade_medida)}
          {centoFator && ` = ${centoFator} × cento`}
          {" · "}
          {item.unidade_medida === "cento"
            ? `cento: ${formatCurrency(item.preco_unitario)}`
            : item.unidade_medida === "peso_kg"
            ? `${formatCurrency(item.preco_unitario)}/kg`
            : `${formatCurrency(item.preco_unitario)}/un.`}
        </p>
      </div>
      <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">
        {formatCurrency(item.valor_total)}
      </span>
      <button
        type="button"
        onClick={() => onRemover(item.id)}
        disabled={disabled}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
        title="Remover item"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Preview do cálculo em tempo real ────────────────────────────────────────

function CalcPreview({
  quantidade,
  preco,
  unidade,
  total,
}: {
  quantidade: number;
  preco: number;
  unidade: UnidadeMedida;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 space-y-0.5">
      <p className="text-xs text-emerald-700 font-medium">Total calculado</p>
      <p className="text-lg font-bold text-emerald-800">{formatCurrency(total)}</p>
      <p className="text-[10px] text-emerald-600">
        {unidade === "peso_kg" && `${quantidade.toFixed(3)} kg × ${formatCurrency(preco)}/kg`}
        {unidade === "cento" &&
          `${Math.round(quantidade)} un. ÷ 100 = ${(quantidade / 100).toFixed(2)} × ${formatCurrency(preco)} do cento`}
        {unidade === "unidade" &&
          `${Math.round(quantidade)} un. × ${formatCurrency(preco)}/un.`}
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  pedidoId: string;
  produtos: Produto[];
  itens: ItemPedido[];
}

export function ItensForm({ pedidoId, produtos, itens }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [error, setError] = useState("");

  const produtoSelecionado = produtos.find((p) => p.id === produtoId) ?? null;
  const unidade = produtoSelecionado?.unidade_medida ?? null;

  const qtdNum = quantidade !== "" ? parseFloat(quantidade) : null;
  const precoNum = precoUnitario !== "" ? parseFloat(precoUnitario) : null;

  const valorCalculado =
    qtdNum !== null && precoNum !== null && unidade && qtdNum > 0 && precoNum >= 0
      ? calcularTotal(qtdNum, precoNum, unidade)
      : null;

  const totalItens = itens.reduce((sum, item) => sum + item.valor_total, 0);
  const inputCfg = unidade ? quantidadeInputConfig(unidade) : null;

  function handleProdutoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setProdutoId(id);
    const prod = produtos.find((p) => p.id === id);
    setPrecoUnitario(prod ? prod.preco_padrao.toString() : "");
    setQuantidade("");
    setError("");
  }

  function handleAdicionar() {
    if (!produtoSelecionado || !unidade) {
      setError("Selecione um produto");
      return;
    }
    if (!qtdNum || qtdNum <= 0) {
      setError("Informe uma quantidade válida");
      return;
    }
    if (precoNum === null || precoNum < 0) {
      setError("Informe um preço válido");
      return;
    }
    if (valorCalculado === null) {
      setError("Não foi possível calcular o total");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await adicionarItemAction(pedidoId, {
        produtoId: produtoSelecionado.id,
        nomeProduto: produtoSelecionado.nome,
        unidadeMedida: unidade,
        precoUnitario: precoNum,
        quantidade: unidade === "unidade" ? Math.round(qtdNum) : qtdNum,
        valorTotal: valorCalculado,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setProdutoId("");
      setQuantidade("");
      setPrecoUnitario("");
      router.refresh();
    });
  }

  function handleRemover(itemId: string) {
    startTransition(async () => {
      const result = await removerItemAction(itemId, pedidoId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  const produtosAtivos = produtos.filter((p) => p.ativo);

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-sm text-gray-700">Itens do Pedido</h2>

      {/* Lista de itens existentes */}
      {itens.length > 0 ? (
        <div className="space-y-2">
          {itens.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onRemover={handleRemover}
              disabled={isPending}
            />
          ))}
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="text-xs font-medium text-gray-500">Total dos itens</span>
            <span className="text-base font-bold text-emerald-700">{formatCurrency(totalItens)}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-5 text-gray-400">
          <Package size={28} strokeWidth={1.5} />
          <p className="text-xs">Nenhum item adicionado</p>
        </div>
      )}

      {/* Formulário de adição de item */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <p className="text-xs font-semibold text-gray-600">Adicionar item</p>

        {/* Seleção de produto */}
        <div>
          <label className="label">Produto</label>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={produtoId}
              onChange={handleProdutoChange}
              disabled={isPending}
            >
              <option value="">Selecionar produto...</option>
              {produtosAtivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {UNIDADE_LABELS[p.unidade_medida]}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          </div>
          {produtosAtivos.length === 0 && (
            <p className="text-[11px] text-amber-600 mt-1">
              Nenhum produto ativo. Cadastre produtos em{" "}
              <a href="/produtos" className="underline">Produtos</a>.
            </p>
          )}
        </div>

        {/* Campos de quantidade e preço — só aparecem após selecionar produto */}
        {produtoSelecionado && inputCfg && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {/* Quantidade com máscara adaptada */}
              <div>
                <label className="label">{inputCfg.label}</label>
                <input
                  className="input"
                  type="number"
                  step={inputCfg.step}
                  min={inputCfg.min}
                  value={quantidade}
                  onChange={(e) => {
                    setQuantidade(e.target.value);
                    setError("");
                  }}
                  placeholder={inputCfg.placeholder}
                  disabled={isPending}
                />
                {unidade === "cento" && qtdNum && qtdNum > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {Math.round(qtdNum)} un. = {(qtdNum / 100).toFixed(2)} cento(s)
                  </p>
                )}
              </div>

              {/* Preço — pré-preenchido do produto, editável */}
              <div>
                <label className="label">{precoLabel(unidade!)}</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoUnitario}
                  onChange={(e) => {
                    setPrecoUnitario(e.target.value);
                    setError("");
                  }}
                  placeholder="Ex: 80,00"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Preview do total em tempo real */}
            {valorCalculado !== null && qtdNum !== null && precoNum !== null && (
              <CalcPreview
                quantidade={qtdNum}
                preco={precoNum}
                unidade={unidade!}
                total={valorCalculado}
              />
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleAdicionar}
          disabled={
            isPending ||
            !produtoSelecionado ||
            !qtdNum ||
            qtdNum <= 0 ||
            precoNum === null ||
            precoNum < 0
          }
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          {isPending ? "Salvando..." : "Adicionar Item"}
        </button>
      </div>
    </div>
  );
}
