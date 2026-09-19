"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPrecificacaoAction, salvarPrecificacaoItensAction } from "./actions";
import { formatCurrency } from "@/lib/utils";
import {
  LIMITE_EXTRA_KG,
  formatQuantidade,
  inputQuantidade,
  labelPreco,
  labelQuantidade,
  precificarItem,
  somarValores,
} from "@/lib/precificacao";
import type { ItemPedido, Pedido, TipoPedido } from "@/types/database";
import { AlertTriangle, Info } from "lucide-react";

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
// Itens: cada bolo (ou doce, ou kit) com a sua própria apuração
//
// Um pedido de dois bolos tem dois pesos reais para registrar. Enquanto a
// precificação era um par peso × preço/kg no pedido, só dava para corrigir um
// deles — o outro ficava com o peso combinado na venda.
// ────────────────────────────────────────────────────────────
interface CampoItem {
  quantidade: string;
  preco: string;
}

/** Item ainda não precificado abre com o que foi combinado na venda. */
function camposDoItem(item: ItemPedido): CampoItem {
  return {
    quantidade: (item.quantidade_real ?? item.quantidade).toString(),
    preco: (item.preco_real ?? item.preco_unitario).toString(),
  };
}

function estadoInicial(itens: ItemPedido[]): Record<string, CampoItem> {
  return Object.fromEntries(itens.map((item) => [item.id, camposDoItem(item)]));
}

function FormItens({ pedido, itens }: { pedido: Pedido; itens: ItemPedido[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campos, setCampos] = useState<Record<string, CampoItem>>(() => estadoInicial(itens));
  // O campo grava em `valor_cobrado`, então é de lá que ele volta preenchido —
  // ler `preco_corrigido` faria o valor ajustado reaparecer como se alguém o
  // tivesse digitado à mão.
  const [valorManual, setValorManual] = useState(pedido.valor_cobrado?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Item adicionado depois que a tela abriu ainda não tem estado próprio: cai
  // no que está gravado nele, em vez de aparecer com os campos em branco e
  // travar o botão de salvar.
  function atualizar(item: ItemPedido, campo: keyof CampoItem, valor: string) {
    setCampos((prev) => ({
      ...prev,
      [item.id]: { ...(prev[item.id] ?? camposDoItem(item)), [campo]: valor },
    }));
    setSaved(false);
  }

  const linhas = useMemo(
    () =>
      itens.map((item) => {
        const campo = campos[item.id] ?? camposDoItem(item);
        const quantidadeReal = campo.quantidade !== "" ? parseFloat(campo.quantidade) : null;
        const precoReal = campo.preco !== "" ? parseFloat(campo.preco) : null;
        const valido =
          quantidadeReal !== null &&
          precoReal !== null &&
          !Number.isNaN(quantidadeReal) &&
          !Number.isNaN(precoReal) &&
          quantidadeReal > 0 &&
          precoReal >= 0;

        return {
          item,
          quantidadeReal,
          precoReal,
          valido,
          calculo: valido
            ? precificarItem({
                unidade: item.unidade_medida,
                quantidadePedida: item.quantidade,
                quantidadeReal: quantidadeReal!,
                precoUnitario: precoReal!,
              })
            : null,
        };
      }),
    [itens, campos]
  );

  const canSave = linhas.every((linha) => linha.valido);
  const valorTotal = canSave ? somarValores(linhas.map((l) => l.calculo!.valorTotal)) : null;
  const valorAjustado = canSave ? somarValores(linhas.map((l) => l.calculo!.valorAjustado)) : null;
  const algumCorte = linhas.some((l) => l.calculo?.aplicouCorte);
  const valorManualDigitado = valorManual ? parseFloat(valorManual) : null;
  // Campo pela metade ("-", "1e") vira NaN, que gravado apagaria a receita do
  // pedido sem aviso: até virar número vale como campo vazio.
  const valorManualNum =
    valorManualDigitado !== null && !Number.isNaN(valorManualDigitado) ? valorManualDigitado : null;

  function handleSave() {
    if (!canSave || valorTotal === null || valorAjustado === null) return;
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await salvarPrecificacaoItensAction(
        pedido.id,
        linhas.map((linha) => ({
          id: linha.item.id,
          quantidadeReal: linha.quantidadeReal!,
          precoReal: linha.precoReal!,
          valorReal: linha.calculo!.valorAjustado,
        })),
        valorTotal,
        valorAjustado,
        valorManualNum
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      // O valor estimado do pedido e a lista de itens leem o que acabou de ser
      // gravado — sem o refresh a tela continuaria mostrando o total anterior.
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Registre o que saiu de cada item — peso, quantidade e preço são por item.
      </p>

      <div className="space-y-3">
        {linhas.map(({ item, calculo }) => {
          const cfg = inputQuantidade(item.unidade_medida);
          const campo = campos[item.id] ?? camposDoItem(item);
          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 space-y-2.5 ${
                calculo?.aplicouCorte ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.nome_produto}</p>
                <p className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-0.5">
                  <Info size={10} /> Pedido: {formatQuantidade(item.quantidade, item.unidade_medida)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{labelQuantidade(item.unidade_medida)}</label>
                  <input
                    className="input bg-white"
                    type="number"
                    step={cfg.step}
                    min={cfg.min}
                    value={campo.quantidade}
                    onChange={(e) => atualizar(item, "quantidade", e.target.value)}
                    placeholder={cfg.placeholder}
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="label">{labelPreco(item.unidade_medida)}</label>
                  <input
                    className="input bg-white"
                    type="number"
                    step="0.01"
                    min="0"
                    value={campo.preco}
                    onChange={(e) => atualizar(item, "preco", e.target.value)}
                    placeholder="Ex: 80.00"
                    disabled={isPending}
                  />
                </div>
              </div>

              {calculo && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500">Valor do item</span>
                  <span
                    className={`text-sm font-bold ${
                      calculo.aplicouCorte ? "text-orange-800" : "text-gray-800"
                    }`}
                  >
                    {formatCurrency(calculo.valorAjustado)}
                  </span>
                </div>
              )}

              {calculo?.aplicouCorte && calculo.limite !== null && (
                <p className="text-[10px] text-orange-600 flex items-start gap-1">
                  <AlertTriangle size={11} className="flex-shrink-0 mt-px" />
                  Excede o pedido em mais de {LIMITE_EXTRA_KG * 1000}g — cobrado até{" "}
                  {calculo.limite.toFixed(2)} kg (de {formatCurrency(calculo.valorTotal)})
                </p>
              )}
            </div>
          );
        })}
      </div>

      {valorTotal !== null && valorAjustado !== null && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 font-medium">Soma dos itens</span>
            <span className="text-sm font-semibold text-gray-700">{formatCurrency(valorTotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
            <span
              className={`text-xs font-medium flex items-center gap-1 ${
                algumCorte ? "text-orange-700" : "text-gray-500"
              }`}
            >
              {algumCorte && <AlertTriangle size={12} className="flex-shrink-0 text-orange-500" />}
              Valor ajustado {algumCorte ? "(regra +300g aplicada)" : "(igual à soma)"}
            </span>
            <span
              className={`text-lg font-bold ${algumCorte ? "text-orange-800" : "text-gray-800"}`}
            >
              {formatCurrency(valorAjustado)}
            </span>
          </div>
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
          disabled={isPending}
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

export function PrecificacaoForm({ pedido, itens = [] }: { pedido: Pedido; itens?: ItemPedido[] }) {
  // Com itens lançados a precificação é item a item — é o único jeito de
  // registrar o peso real de cada bolo de um pedido com mais de um. Pedido sem
  // item (lançado antes do catálogo, ou rascunho) continua na medida única.
  const temItens = itens.length > 0;

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-sm text-gray-700">
        {temItens && itens.length > 1 ? "Precificação dos Itens" : TIPO_TITULO[pedido.tipo]}
      </h2>
      {temItens ? (
        <FormItens pedido={pedido} itens={itens} />
      ) : (
        <>
          {pedido.tipo === "bolo" && <FormBolo pedido={pedido} />}
          {pedido.tipo === "doce" && <FormDoce pedido={pedido} />}
          {pedido.tipo === "kit" && <FormKit pedido={pedido} />}
        </>
      )}
    </div>
  );
}
