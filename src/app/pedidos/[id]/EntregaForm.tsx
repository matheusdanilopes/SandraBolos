"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import type { Pedido } from "@/types/database";

export function EntregaForm({ pedido, valorFinal }: { pedido: Pedido; valorFinal: number | null }) {
  const router = useRouter();
  const [valorCobrado, setValorCobrado] = useState(
    pedido.valor_cobrado?.toString() ?? valorFinal?.toString() ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    await supabase.from("pedidos").update({
      valor_cobrado: valorCobrado ? parseFloat(valorCobrado) : null,
    }).eq("id", pedido.id);
    setSaved(true);
    setLoading(false);
    router.refresh();
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

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full">
        {loading ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
      </button>
    </div>
  );
}
