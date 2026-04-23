"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { Pedido } from "@/types/database";

export function PrecificacaoForm({ pedido }: { pedido: Pedido }) {
  const router = useRouter();
  const [precoPorKg, setPrecoPorKg] = useState(pedido.preco_por_kg?.toString() ?? "");
  const [precoCorrigido, setPrecoCorrigido] = useState(pedido.preco_corrigido?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const valorCalculado = pedido.peso && precoPorKg ? pedido.peso * parseFloat(precoPorKg) : null;
  const valorFinal = precoCorrigido ? parseFloat(precoCorrigido) : valorCalculado;

  async function handleSave() {
    setLoading(true);
    await supabase.from("pedidos").update({
      preco_por_kg: precoPorKg ? parseFloat(precoPorKg) : null,
      valor_calculado: valorCalculado,
      preco_corrigido: precoCorrigido ? parseFloat(precoCorrigido) : null,
    }).eq("id", pedido.id);
    setSaved(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="card p-4 space-y-3">
      <h2 className="font-semibold text-sm text-gray-700">Precificação</h2>

      <div>
        <label className="label">Preço por kg (R$)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={precoPorKg}
          onChange={(e) => { setPrecoPorKg(e.target.value); setSaved(false); }}
          placeholder="Ex: 80.00"
        />
      </div>

      {valorCalculado !== null && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <span className="text-gray-500">Valor calculado: </span>
          <span className="font-semibold">{formatCurrency(valorCalculado)}</span>
          <span className="text-xs text-gray-400 ml-1">({pedido.peso}kg × R${precoPorKg}/kg)</span>
        </div>
      )}

      <div>
        <label className="label">Preço corrigido (opcional)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={precoCorrigido}
          onChange={(e) => { setPrecoCorrigido(e.target.value); setSaved(false); }}
          placeholder="Deixe vazio para usar o calculado"
        />
      </div>

      {valorFinal !== null && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm">
          <span className="text-brand-700 font-medium">Valor final: </span>
          <span className="font-bold text-brand-800">{formatCurrency(valorFinal)}</span>
          {precoCorrigido && <span className="text-xs text-brand-600 ml-1">(corrigido)</span>}
        </div>
      )}

      <button onClick={handleSave} disabled={loading || !precoPorKg} className="btn-primary w-full">
        {loading ? "Salvando..." : saved ? "Salvo!" : "Salvar Precificação"}
      </button>
    </div>
  );
}
