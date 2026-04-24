"use client";

import { useState, useTransition } from "react";
import { salvarEntregaAction } from "./actions";
import { formatCurrency } from "@/lib/utils";
import type { Pedido } from "@/types/database";

export function EntregaForm({ pedido, valorFinal }: { pedido: Pedido; valorFinal: number | null }) {
  const [isPending, startTransition] = useTransition();
  const [valorCobrado, setValorCobrado] = useState(
    pedido.valor_cobrado?.toString() ?? valorFinal?.toString() ?? ""
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await salvarEntregaAction(
        pedido.id,
        valorCobrado ? parseFloat(valorCobrado) : null
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="card p-4 space-y-3">
      <h2 className="font-semibold text-sm text-gray-700">Entrega</h2>

      {valorFinal !== null && (
        <div className="text-sm text-gray-600">
          Valor final: <span className="font-medium">{formatCurrency(valorFinal)}</span>
        </div>
      )}

      <div>
        <label className="label">Valor cobrado (R$)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={valorCobrado}
          onChange={(e) => { setValorCobrado(e.target.value); setSaved(false); }}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button onClick={handleSave} disabled={isPending} className="btn-primary w-full">
        {isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
      </button>
    </div>
  );
}
