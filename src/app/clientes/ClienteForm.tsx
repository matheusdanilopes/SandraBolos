"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarClienteAction, editarClienteAction } from "./actions";
import type { Cliente } from "@/types/database";

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const isEdit = !!cliente;
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [telefone, setTelefone] = useState(cliente?.telefone ?? "");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome) { setError("Nome é obrigatório"); return; }
    if (!telefone) { setError("Telefone é obrigatório"); return; }

    setError("");
    startTransition(async () => {
      const result = isEdit
        ? await editarClienteAction(cliente.id, nome, telefone)
        : await criarClienteAction(nome, telefone);

      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4">
      <div>
        <label className="label">Nome *</label>
        <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
      </div>
      <div>
        <label className="label">Telefone *</label>
        <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" type="tel" />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
        </button>
      </div>
    </form>
  );
}
