"use client";

import { useState, useTransition } from "react";
import { salvarPrecificacaoAction } from "./actions";
import { formatCurrency } from "@/lib/utils";
import type { Pedido } from "@/types/database";
import { AlertTriangle, Info } from "lucide-react";

function derivarPesoReal(pedido: Pedido): string {
  if (pedido.valor_calculado && pedido.preco_por_kg) {
    return (pedido.valor_calculado / pedido.preco_por_kg).toFixed(2);
  }
  return pedido.peso?.toString() ?? "";
}

interface Props {
  pedido: Pedido;
  limiteExtraKg: number;
}

export function PrecificacaoForm({ pedido, limiteExtraKg }: Props) {
  const [isPending, startTransition] = useTransition();
  const [pesoReal, setPesoReal] = useState(derivarPesoReal(pedido));
  const [precoPorKg, setPrecoPorKg] = useState(pedido.preco_por_kg?.toString() ?? "");
  const [valorManual, setValorManual] = useState(pedido.valor_cobrado?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const pesoPedido = pedido.peso ?? 0;
  const pesoRealNum = pesoReal ? parseFloat(pesoReal) : null;
  const precoKgNum = precoPorKg ? parseFloat(precoPorKg) : null;

  // Preço 1: multiplicação total (peso real × preço/kg)
  const valorTotal = pesoRealNum && precoKgNum ? pesoRealNum * precoKgNum : null;

  // Preço 2: se peso real > peso pedido + limite configurado, cobra só até esse teto
  const limiteKg = pesoPedido + limiteExtraKg;
  const limiteExtraG = Math.round(limiteExtraKg * 1000);
  const aplicouCorte = pesoRealNum !== null && pesoRealNum > limiteKg;
  const pesoParaCorte = aplicouCorte ? limiteKg : pesoRealNum;
  const valorAjustado = pesoParaCorte && precoKgNum ? pesoParaCorte * precoKgNum : null;

  // Preço 3: valor manual (opcional)
  const valorManualNum = valorManual ? parseFloat(valorManual) : null;

  const canSave = !!pesoReal && !!precoPorKg;

  function handleSave() {
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await salvarPrecificacaoAction(
        pedido.id,
        precoKgNum,
        valorTotal,
        valorAjustado,
        valorManualNum
      );
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-sm text-gray-700">Precificação</h2>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Peso real (kg)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={pesoReal}
            onChange={(e) => { setPesoReal(e.target.value); setSaved(false); }}
            placeholder="Ex: 2.30"
          />
          {pesoPedido > 0 && (
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
              <Info size={10} /> Pedido: {pesoPedido} kg
            </p>
          )}
        </div>

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
      </div>

      {/* Preço 1 — valor total calculado */}
      {valorTotal !== null && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-0.5">
          <p className="text-xs text-gray-500 font-medium">Valor total calculado</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(valorTotal)}</p>
          <p className="text-[10px] text-gray-400">
            {pesoRealNum} kg × {formatCurrency(precoKgNum)}
          </p>
        </div>
      )}

      {/* Preço 2 — valor ajustado pela regra dos 300g */}
      {valorAjustado !== null && (
        <div
          className={`rounded-lg border p-3 space-y-0.5 ${
            aplicouCorte
              ? "border-orange-200 bg-orange-50"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {aplicouCorte && <AlertTriangle size={13} className="text-orange-500 flex-shrink-0" />}
            <p className={`text-xs font-medium ${aplicouCorte ? "text-orange-700" : "text-gray-500"}`}>
              Valor ajustado {aplicouCorte ? "(regra +300g aplicada)" : "(igual ao total)"}
            </p>
          </div>
          <p className={`text-lg font-bold ${aplicouCorte ? "text-orange-800" : "text-gray-800"}`}>
            {formatCurrency(valorAjustado)}
          </p>
          {aplicouCorte && (
            <p className="text-[10px] text-orange-600">
              Peso real ({pesoRealNum} kg) excede o pedido em mais de {limiteExtraG}g — cobrado até{" "}
              {limiteKg.toFixed(2)} kg × {formatCurrency(precoKgNum)}
            </p>
          )}
        </div>
      )}

      {/* Preço 3 — valor corrigido manual (opcional) */}
      <div>
        <label className="label">Valor corrigido manual (opcional)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={valorManual}
          onChange={(e) => { setValorManual(e.target.value); setSaved(false); }}
          placeholder="Deixe vazio para usar o valor ajustado"
        />
        {valorManualNum !== null && (
          <p className="text-xs text-brand-600 mt-1 font-medium">
            Valor a cobrar: {formatCurrency(valorManualNum)}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isPending || !canSave}
        className="btn-primary w-full"
      >
        {isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar Precificação"}
      </button>
    </div>
  );
}
