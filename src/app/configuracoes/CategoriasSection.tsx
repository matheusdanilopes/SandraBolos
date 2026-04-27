"use client";

import { useState, useTransition } from "react";
import { Plus, X, Tag } from "lucide-react";
import { adicionarCategoriaAction, excluirCategoriaAction } from "./actions";
import type { CategoriaCusto } from "@/types/database";

export function CategoriasSection({ categorias }: { categorias: CategoriaCusto[] }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdicionar() {
    const nomeTrimmed = nome.trim();
    if (nomeTrimmed.length < 2) {
      setErro("Nome deve ter ao menos 2 caracteres.");
      return;
    }
    setErro("");
    startTransition(async () => {
      const res = await adicionarCategoriaAction(nomeTrimmed);
      if (res.error) {
        setErro(res.error);
      } else {
        setNome("");
      }
    });
  }

  function handleExcluir(id: string) {
    setConfirmandoId(null);
    startTransition(async () => {
      await excluirCategoriaAction(id);
    });
  }

  return (
    <div className="card p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Tag size={15} className="text-brand-600" />
          <h2 className="font-semibold text-sm text-gray-800">Categorias de Custo</h2>
        </div>
        <p className="text-xs text-gray-500">
          Usadas para classificar os lançamentos de custos no financeiro.
        </p>
      </div>

      {/* Lista */}
      <div className="space-y-1.5">
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma categoria cadastrada.</p>
        ) : (
          categorias.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-gray-800">{cat.nome}</span>

              {confirmandoId === cat.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Excluir?</span>
                  <button
                    onClick={() => handleExcluir(cat.id)}
                    disabled={isPending}
                    className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmandoId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmandoId(cat.id)}
                  disabled={isPending}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1"
                  aria-label={`Excluir ${cat.nome}`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Formulário de adição */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <label className="label text-xs">Nova categoria</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input text-sm flex-1"
            placeholder="Ex: Gás, Energia, Marketing…"
            value={nome}
            onChange={(e) => { setNome(e.target.value); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdicionar()}
            maxLength={50}
          />
          <button
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
