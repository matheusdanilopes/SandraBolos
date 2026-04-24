"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarSaborAction, editarSaborAction } from "./actions";
import { TIPO_SABOR_LABELS, type Sabor, type TipoSabor } from "@/types/database";

const TIPOS: TipoSabor[] = ["bolo", "doce", "ambos"];

export function SaborForm({ sabor }: { sabor?: Sabor }) {
  const router = useRouter();
  const isEdit = !!sabor;
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState(sabor?.nome ?? "");
  const [tipo, setTipo] = useState<TipoSabor>(sabor?.tipo ?? "bolo");
  const [ativo, setAtivo] = useState(sabor?.ativo ?? true);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório"); return; }
    setError("");
    startTransition(async () => {
      const result = isEdit
        ? await editarSaborAction(sabor.id, nome, tipo, ativo)
        : await criarSaborAction(nome, tipo);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4">
      <div>
        <label className="label">Nome do sabor *</label>
        <input
          className="input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Chocolate, Morango, Brigadeiro..."
          autoFocus
        />
      </div>

      <div>
        <label className="label">Aplicável a</label>
        <div className="flex gap-2">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors ${
                tipo === t
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-300"
              }`}
            >
              {TIPO_SABOR_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setAtivo((v) => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              ativo ? "bg-brand-600" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                ativo ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
          <span className="text-sm text-gray-700">{ativo ? "Ativo" : "Inativo"}</span>
        </label>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1"
        >
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar Sabor"}
        </button>
      </div>
    </form>
  );
}
