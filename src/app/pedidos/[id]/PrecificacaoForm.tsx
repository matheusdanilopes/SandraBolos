"use client";

import { useState, useTransition } from "react";
import { salvarPrecificacaoAction } from "./actions";
import { formatCurrency } from "@/lib/utils";
import type { Pedido, TipoPedido } from "@/types/database";
import { AlertTriangle, Info } from "lucide-react";

const LIMITE_EXTRA_KG = 0.3;

function derivarPesoReal(pedido: Pedido): string {
  if (pedido.valor_calculado && pedido.preco_por_kg) {
    return (pedido.valor_calculado / pedido.preco_por_kg).toFixed(2);
  }
  return pedido.peso?.toString() ?? "";
}

function derivarQtdReal(pedido: Pedido): string {
  if (pedido.valor_calculado && pedido.preco_por_kg) {
    return Math.round(pedido.valor_calculado / pedido.preco_por_kg).toString();
  }
  return pedido.quantidade?.toString() ?? "";
}

// ────────────────────────────────────────────────────────────
// Bolo: peso × preço/kg + regra dos 300g
// ────────────────────────────────────────────────────────────
function FormBolo({ pedido }: { pedido: Pedido }) {
  const [isPending, startTransition] = useTransition();
  const [pesoReal, setPesoReal] = useState(derivarPesoReal(pedido));
  const [precoPorKg, setPrecoPorKg] = useState(pedido.preco_por_kg?.toString() ?? "");
  const [valorManual, setValorManual] = useState(pedido.preco_corrigido?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const pesoPedido = pedido.peso ?? 0;
  const pesoRealNum = pesoReal ? parseFloat(pesoReal) : null;
  const precoKgNum = precoPorKg ? parseFloat(precoPorKg) : null;

  const valorTotal = pesoRealNum && precoKgNum ? pesoRealNum * precoKgNum : null;
  const limiteKg = pesoPedido + LIMITE_EXTRA_KG;
  const aplicouCorte = pesoRealNum !== null && pesoRealNum > limiteKg;
  const pesoParaCorte = aplicouCorte ? limiteKg : pesoRealNum;
  const valorAjustado = pesoParaCorte && precoKgNum ? pesoParaCorte * precoKgNum : null;
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
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
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

      {valorTotal !== null && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-0.5">
          <p className="text-xs text-gray-500 font-medium">Valor total calculado</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(valorTotal)}</p>
          <p className="text-[10px] text-gray-400">
            {pesoRealNum} kg × {formatCurrency(precoKgNum)}
          </p>
        </div>
      )}

      {valorAjustado !== null && (
        <div className={`rounded-lg border p-3 space-y-0.5 ${aplicouCorte ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-50"}`}>
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
              Peso real ({pesoRealNum} kg) excede o pedido em mais de 300g — cobrado até{" "}
              {limiteKg.toFixed(2)} kg × {formatCurrency(precoKgNum)}
            </p>
          )}
        </div>
      )}

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
      <button onClick={handleSave} disabled={isPending || !canSave} className="btn-primary w-full">
        {isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar Precificação"}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Doce: quantidade × preço por unidade
// ────────────────────────────────────────────────────────────
function FormDoce({ pedido }: { pedido: Pedido }) {
  const [isPending, startTransition] = useTransition();
  const [qtdReal, setQtdReal] = useState(derivarQtdReal(pedido));
  const [precoUn, setPrecoUn] = useState(pedido.preco_por_kg?.toString() ?? "");
  const [valorManual, setValorManual] = useState(pedido.preco_corrigido?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const qtdNum = qtdReal ? parseInt(qtdReal) : null;
  const precoUnNum = precoUn ? parseFloat(precoUn) : null;
  const valorCalculado = qtdNum && precoUnNum ? qtdNum * precoUnNum : null;
  const valorManualNum = valorManual ? parseFloat(valorManual) : null;

  const canSave = !!qtdReal && !!precoUn;

  function handleSave() {
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await salvarPrecificacaoAction(
        pedido.id,
        precoUnNum,
        valorCalculado,
        valorCalculado,
        valorManualNum
      );
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Quantidade real</label>
          <input
            className="input"
            type="number"
            min="1"
            value={qtdReal}
            onChange={(e) => { setQtdReal(e.target.value); setSaved(false); }}
            placeholder="Ex: 50"
          />
          {pedido.quantidade && (
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
              <Info size={10} /> Pedido: {pedido.quantidade} un.
            </p>
          )}
        </div>
        <div>
          <label className="label">Preço por unidade (R$)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={precoUn}
            onChange={(e) => { setPrecoUn(e.target.value); setSaved(false); }}
            placeholder="Ex: 4.50"
          />
        </div>
      </div>

      {valorCalculado !== null && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-0.5">
          <p className="text-xs text-gray-500 font-medium">Valor calculado</p>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(valorCalculado)}</p>
          <p className="text-[10px] text-gray-400">
            {qtdNum} un. × {formatCurrency(precoUnNum)}
          </p>
        </div>
      )}

      <div>
        <label className="label">Valor manual (opcional)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={valorManual}
          onChange={(e) => { setValorManual(e.target.value); setSaved(false); }}
          placeholder="Deixe vazio para usar o calculado"
        />
        {valorManualNum !== null && (
          <p className="text-xs text-brand-600 mt-1 font-medium">
            Valor a cobrar: {formatCurrency(valorManualNum)}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleSave} disabled={isPending || !canSave} className="btn-primary w-full">
        {isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar Precificação"}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Kit: valor flat
// ────────────────────────────────────────────────────────────
function FormKit({ pedido }: { pedido: Pedido }) {
  const [isPending, startTransition] = useTransition();
  const [valorKit, setValorKit] = useState(
    (pedido.preco_corrigido ?? pedido.valor_calculado)?.toString() ?? ""
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const valorNum = valorKit ? parseFloat(valorKit) : null;
  const canSave = !!valorKit;

  function handleSave() {
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await salvarPrecificacaoAction(
        pedido.id,
        null,
        valorNum,
        valorNum,
        null
      );
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Valor do kit (R$)</label>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={valorKit}
          onChange={(e) => { setValorKit(e.target.value); setSaved(false); }}
          placeholder="Ex: 150.00"
        />
        {valorNum !== null && (
          <p className="text-xs text-brand-600 mt-1 font-medium">
            Valor a cobrar: {formatCurrency(valorNum)}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={handleSave} disabled={isPending || !canSave} className="btn-primary w-full">
        {isPending ? "Salvando..." : saved ? "Salvo!" : "Salvar Precificação"}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────
const TIPO_TITULO: Record<TipoPedido, string> = {
  bolo: "Precificação do Bolo",
  doce: "Precificação dos Doces",
  kit: "Precificação do Kit",
};

export function PrecificacaoForm({ pedido }: { pedido: Pedido }) {
  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-sm text-gray-700">{TIPO_TITULO[pedido.tipo]}</h2>
      {pedido.tipo === "bolo" && <FormBolo pedido={pedido} />}
      {pedido.tipo === "doce" && <FormDoce pedido={pedido} />}
      {pedido.tipo === "kit" && <FormKit pedido={pedido} />}
    </div>
  );
}
