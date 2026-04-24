"use client";

import { useState, useTransition } from "react";
import { salvarConfiguracaoAction } from "./actions";
import { Scale } from "lucide-react";

interface Props {
  limiteAtualKg: number;
}

export function ConfigForm({ limiteAtualKg }: Props) {
  const [isPending, startTransition] = useTransition();
  // Exibido e editado em gramas; armazenado em kg
  const [limiteG, setLimiteG] = useState(Math.round(limiteAtualKg * 1000).toString());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const g = parseFloat(limiteG);
    if (isNaN(g) || g < 0) { setError("Informe um valor válido em gramas"); return; }
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await salvarConfiguracaoAction(g / 1000);
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
          <Scale size={18} className="text-brand-600" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-gray-800">Tolerância de peso na correção</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Se o peso real do bolo exceder o peso do pedido em mais do que esse
            valor, o preço é calculado sobre{" "}
            <span className="font-medium text-gray-700">
              peso do pedido + {limiteG} g
            </span>{" "}
            em vez do peso real.
          </p>
        </div>
      </div>

      <div>
        <label className="label">Limite de tolerância (g)</label>
        <div className="relative">
          <input
            className="input pr-8"
            type="number"
            min="0"
            step="1"
            value={limiteG}
            onChange={(e) => { setLimiteG(e.target.value); setSaved(false); }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
            g
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Padrão: 300 g
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar configuração"}
      </button>
    </form>
  );
}
