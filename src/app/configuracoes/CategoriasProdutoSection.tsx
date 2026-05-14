"use client";

import { useState, useTransition } from "react";
import {
  Plus, Pencil, X, Check,
  ToggleLeft, ToggleRight,
  ChevronUp, ChevronDown,
  UtensilsCrossed,
} from "lucide-react";
import type { CategoriaProduto } from "@/types/database";
import {
  adicionarCategoriaProdutoAction,
  editarCategoriaProdutoAction,
  excluirCategoriaProdutoAction,
  toggleCategoriaProdutoAtivoAction,
  reordenarCategoriaProdutoAction,
} from "./actions";

interface RowProps {
  cat: CategoriaProduto;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function CategoriaRow({ cat, isFirst, isLast, onMoveUp, onMoveDown }: RowProps) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(cat.nome);
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  function handleSave() {
    if (nome.trim().length < 2) { setErro("Mín. 2 caracteres."); return; }
    setErro("");
    startTransition(async () => {
      const res = await editarCategoriaProdutoAction(cat.id, nome.trim());
      if (res.error) setErro(res.error);
      else setEditing(false);
    });
  }

  function handleToggle() {
    startTransition(async () => {
      await toggleCategoriaProdutoAtivoAction(cat.id, !cat.ativo);
    });
  }

  function handleExcluir() {
    setConfirmando(false);
    startTransition(async () => {
      const res = await excluirCategoriaProdutoAction(cat.id);
      if (res.error) setErro(res.error);
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-2.5 space-y-2">
        <input
          className="input text-sm"
          value={nome}
          onChange={(e) => { setNome(e.target.value); setErro(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setEditing(false); setNome(cat.nome); setErro(""); }}
            className="btn-secondary flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
          >
            <X size={12} /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
          >
            <Check size={12} /> Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 transition-colors ${cat.ativo ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
      {/* Ordem controls */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst || isPending}
          className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors"
          title="Mover para cima"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast || isPending}
          className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors"
          title="Mover para baixo"
        >
          <ChevronDown size={13} />
        </button>
      </div>

      <span className="flex-1 text-sm text-gray-800 truncate">{cat.nome}</span>

      {/* Error inline */}
      {erro && <span className="text-xs text-red-500 truncate max-w-[100px]">{erro}</span>}

      {/* Actions */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="p-1 rounded text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        title="Editar"
      >
        <Pencil size={13} />
      </button>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`p-1 rounded transition-colors disabled:opacity-50 ${cat.ativo ? "text-emerald-500 hover:text-gray-400" : "text-gray-400 hover:text-emerald-500"}`}
        title={cat.ativo ? "Desativar" : "Ativar"}
      >
        {cat.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
      </button>

      {confirmando ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleExcluir}
            disabled={isPending}
            className="text-xs font-medium text-red-600 hover:text-red-700"
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Não
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={isPending}
          className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors"
          title="Excluir"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

export function CategoriasProdutoSection({
  categorias,
}: {
  categorias: CategoriaProduto[];
}) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdicionar() {
    if (nome.trim().length < 2) { setErro("Nome deve ter ao menos 2 caracteres."); return; }
    setErro("");
    const maxOrdem = categorias.reduce((m, c) => Math.max(m, c.ordem), 0);
    startTransition(async () => {
      const res = await adicionarCategoriaProdutoAction(nome.trim(), maxOrdem);
      if (res.error) setErro(res.error);
      else setNome("");
    });
  }

  function handleMove(index: number, direcao: "up" | "down") {
    const target = direcao === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= categorias.length) return;

    const a = categorias[index];
    const b = categorias[target];

    startTransition(async () => {
      await reordenarCategoriaProdutoAction([
        { id: a.id, ordem: b.ordem },
        { id: b.id, ordem: a.ordem },
      ]);
    });
  }

  return (
    <div className="card p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed size={15} className="text-brand-600" />
          <h2 className="font-semibold text-sm text-gray-800">Categorias de Produto</h2>
        </div>
        <p className="text-xs text-gray-500">
          Usadas para agrupar produtos no cardápio. Use as setas para ordenar.
        </p>
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma categoria cadastrada.</p>
        ) : (
          categorias.map((cat, i) => (
            <CategoriaRow
              key={cat.id}
              cat={cat}
              isFirst={i === 0}
              isLast={i === categorias.length - 1}
              onMoveUp={() => handleMove(i, "up")}
              onMoveDown={() => handleMove(i, "down")}
            />
          ))
        )}
      </div>

      {/* Add form */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <label className="label text-xs">Nova categoria</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input text-sm flex-1"
            placeholder="Ex: Bolos, Doces, Salgados…"
            value={nome}
            onChange={(e) => { setNome(e.target.value); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdicionar()}
            maxLength={50}
            disabled={isPending}
          />
          <button
            type="button"
            onClick={handleAdicionar}
            disabled={isPending || nome.trim().length < 2}
            className="btn-primary flex items-center gap-1 text-sm px-3 py-2"
          >
            <Plus size={15} />
            Adicionar
          </button>
        </div>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </div>
  );
}
