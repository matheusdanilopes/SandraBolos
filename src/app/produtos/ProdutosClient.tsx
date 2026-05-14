"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Plus, Pencil, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Produto, UnidadeMedida, CardapioConfig } from "@/types/database";
import { UNIDADE_LABELS } from "@/types/database";
import { criarProdutoAction, editarProdutoAction, toggleAtivoAction } from "./actions";
import { CardapioVisual } from "./CardapioVisual";

const UNIDADES: UnidadeMedida[] = ["peso_kg", "cento", "unidade"];

interface Props {
  produtos: Produto[];
  configCardapio: CardapioConfig | null;
}

interface EditState {
  nome: string;
  unidade_medida: UnidadeMedida;
  preco_padrao: string;
}

function ProdutoRow({ produto }: { produto: Produto }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState>({
    nome: produto.nome,
    unidade_medida: produto.unidade_medida,
    preco_padrao: produto.preco_padrao.toString(),
  });
  const [error, setError] = useState("");

  function handleSave() {
    const preco = parseFloat(form.preco_padrao);
    if (!form.nome.trim() || isNaN(preco)) {
      setError("Preencha nome e preço corretamente");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await editarProdutoAction(produto.id, {
        nome: form.nome,
        unidade_medida: form.unidade_medida,
        preco_padrao: preco,
        ativo: produto.ativo,
      });
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  function handleToggleAtivo() {
    startTransition(async () => {
      await toggleAtivoAction(produto.id, !produto.ativo);
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input col-span-2"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Nome do produto"
          />
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={form.unidade_medida}
              onChange={(e) => setForm((f) => ({ ...f, unidade_medida: e.target.value as UnidadeMedida }))}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>{UNIDADE_LABELS[u]}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={form.preco_padrao}
            onChange={(e) => setForm((f) => ({ ...f, preco_padrao: e.target.value }))}
            placeholder="Preço padrão"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setEditing(false); setError(""); }}
            className="btn-secondary flex-1 flex items-center justify-center gap-1 text-xs py-1.5"
          >
            <X size={13} /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-1 text-xs py-1.5"
          >
            <Check size={13} /> Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${produto.ativo ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{produto.nome}</p>
        <p className="text-[11px] text-gray-500">
          {UNIDADE_LABELS[produto.unidade_medida]} · {formatCurrency(produto.preco_padrao)}
          {produto.unidade_medida === "peso_kg" && "/kg"}
          {produto.unidade_medida === "cento" && "/cento"}
          {produto.unidade_medida === "unidade" && "/un."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        title="Editar"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={handleToggleAtivo}
        disabled={isPending}
        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${produto.ativo ? "text-emerald-500 hover:text-gray-400" : "text-gray-400 hover:text-emerald-500"}`}
        title={produto.ativo ? "Desativar" : "Ativar"}
      >
        {produto.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
      </button>
    </div>
  );
}

function NovoProdutoForm() {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<UnidadeMedida>("unidade");
  const [preco, setPreco] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const precoNum = parseFloat(preco);
    if (!nome.trim() || isNaN(precoNum) || precoNum < 0) {
      setError("Preencha nome e preço corretamente");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await criarProdutoAction({
        nome,
        unidade_medida: unidade,
        preco_padrao: precoNum,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setNome("");
      setPreco("");
      setUnidade("unidade");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Novo Produto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Novo produto</p>
      <input
        className="input"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do produto"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <select
            className="input appearance-none pr-8"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>{UNIDADE_LABELS[u]}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder={
            unidade === "peso_kg" ? "Preço/kg" :
            unidade === "cento" ? "Preço/cento" :
            "Preço/un."
          }
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="btn-secondary flex-1 text-sm py-1.5"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary flex-1 text-sm py-1.5"
        >
          {isPending ? "Salvando..." : "Criar"}
        </button>
      </div>
    </form>
  );
}

export function ProdutosClient({ produtos, configCardapio }: Props) {
  const ativos = produtos.filter((p) => p.ativo);
  const inativos = produtos.filter((p) => !p.ativo);

  return (
    <div className="space-y-4">
      <NovoProdutoForm />

      {ativos.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ativos ({ativos.length})</p>
          {ativos.map((p) => <ProdutoRow key={p.id} produto={p} />)}
        </div>
      )}

      {inativos.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Inativos ({inativos.length})</p>
          {inativos.map((p) => <ProdutoRow key={p.id} produto={p} />)}
        </div>
      )}

      {produtos.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-sm">Nenhum produto cadastrado.</p>
          <p className="text-xs mt-1">Crie produtos para usar no cálculo de itens.</p>
        </div>
      )}

      {/* Cardápio Visual */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Cardápio Visual</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Personalize e exporte seu cardápio como imagem PNG para compartilhar.
          </p>
        </div>
        <CardapioVisual produtos={produtos} configInicial={configCardapio} />
      </div>
    </div>
  );
}
