"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPrecificacaoAction, salvarPrecificacaoItensAction } from "./actions";
import { formatCurrency } from "@/lib/utils";
import {
  LIMITE_EXTRA_KG,
  calcularTotalItem,
  formatQuantidade,
  inputQuantidade,
  labelPreco,
  labelQuantidade,
  precificarItem,
  precoUnitarioDoValor,
  somarValores,
} from "@/lib/precificacao";
import type { ItemPedido, Pedido, TipoPedido, UnidadeMedida } from "@/types/database";
import { AlertTriangle, Info } from "lucide-react";

// ────────────────────────────────────────────────────────────
// Campos ligados: quantidade × preço = valor
//
// Os três são a mesma conta vista de ângulos diferentes, e qual deles se sabe
// primeiro muda com o pedido: às vezes o bolo é pesado e o preço do kg é o de
// tabela (sai o valor); às vezes o valor já foi combinado com a cliente e o que
// falta é saber em quanto ficou o kg. Preencher dois preenche o terceiro, em
// qualquer direção.
//
// `ancora` guarda qual dos dois — preço ou valor — foi digitado por último, para
// que corrigir o peso recalcule o outro em vez de sobrescrever o que a pessoa
// acabou de informar.
// ────────────────────────────────────────────────────────────
type Ancora = "preco" | "valor";
type CampoEditado = "quantidade" | "preco" | "valor";

interface CamposItem {
  quantidade: string;
  preco: string;
  valor: string;
  ancora: Ancora;
}

function num(texto: string): number | null {
  if (texto.trim() === "") return null;
  const valor = parseFloat(texto);
  return Number.isNaN(valor) ? null : valor;
}

/** Número de volta para o campo, sem casas sobrando ("80", não "80.0000"). */
function paraCampo(valor: number): string {
  return String(valor);
}

function sincronizar(
  campos: CamposItem,
  unidade: UnidadeMedida,
  editado: CampoEditado
): CamposItem {
  // Mexer no peso não muda quem manda na conta; digitar preço ou valor, sim.
  const ancora: Ancora = editado === "quantidade" ? campos.ancora : editado;
  const quantidade = num(campos.quantidade);

  // Sem quantidade não há divisão nem multiplicação possível — o que já está
  // digitado fica como está, esperando o peso.
  if (quantidade === null || quantidade <= 0) return { ...campos, ancora };

  // Campo apagado para ser redigitado não pode levar o outro junto: quem limpa
  // o valor para trocá-lo ainda tem o preço na tela, e o item segue valendo o
  // que valia até o número novo chegar.
  if (ancora === "preco") {
    const preco = num(campos.preco);
    if (preco === null) return { ...campos, ancora };
    return { ...campos, ancora, valor: paraCampo(calcularTotalItem(quantidade, preco, unidade)) };
  }

  const valor = num(campos.valor);
  if (valor === null) return { ...campos, ancora };
  const preco = precoUnitarioDoValor(valor, quantidade, unidade);
  return { ...campos, ancora, preco: preco === null ? campos.preco : paraCampo(preco) };
}

function camposDe(
  unidade: UnidadeMedida,
  quantidade: string,
  preco: string,
  valor?: string
): CamposItem {
  const campos: CamposItem = { quantidade, preco, valor: valor ?? "", ancora: "preco" };
  // Valor já gravado abre como está; sem ele, sai da multiplicação.
  return valor ? campos : sincronizar(campos, unidade, "preco");
}

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

/** Dica dos campos ligados — a mesma em todos os formulários. */
function DicaCamposLigados({ unidade }: { unidade: UnidadeMedida }) {
  const medida = unidade === "peso_kg" ? "o peso" : "a quantidade";
  const preco =
    unidade === "peso_kg" ? "o preço por kg" : unidade === "cento" ? "o preço do cento" : "o preço unitário";
  return (
    <p className="text-[11px] text-gray-400">
      Preencha dois e o terceiro sai sozinho: com {medida} e {preco} sai o valor; com {medida} e o
      valor sai {preco}.
    </p>
  );
}

/** Campo de valor com o preço/valor recalculado a cada tecla. */
function CampoValor({
  label,
  valor,
  onChange,
  disabled,
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type="number"
        step="0.01"
        min="0"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: 150.00"
        disabled={disabled}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Itens: cada bolo (ou doce, ou kit) com a sua própria apuração
//
// Um pedido de dois bolos tem dois pesos reais para registrar. Enquanto a
// precificação era um par peso × preço/kg no pedido, só dava para corrigir um
// deles — o outro ficava com o peso combinado na venda.
// ────────────────────────────────────────────────────────────

/** Item ainda não precificado abre com o que foi combinado na venda. */
function camposDoItem(item: ItemPedido): CamposItem {
  return camposDe(
    item.unidade_medida,
    (item.quantidade_real ?? item.quantidade).toString(),
    (item.preco_real ?? item.preco_unitario).toString(),
    item.valor_real != null ? item.valor_real.toString() : undefined
  );
}

function estadoInicial(itens: ItemPedido[]): Record<string, CamposItem> {
  return Object.fromEntries(itens.map((item) => [item.id, camposDoItem(item)]));
}

function FormItens({ pedido, itens }: { pedido: Pedido; itens: ItemPedido[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [campos, setCampos] = useState<Record<string, CamposItem>>(() => estadoInicial(itens));
  // O campo grava em `valor_cobrado`, então é de lá que ele volta preenchido —
  // ler `preco_corrigido` faria o valor ajustado reaparecer como se alguém o
  // tivesse digitado à mão.
  const [valorManual, setValorManual] = useState(pedido.valor_cobrado?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Item adicionado depois que a tela abriu ainda não tem estado próprio: cai
  // no que está gravado nele, em vez de aparecer com os campos em branco e
  // travar o botão de salvar.
  function atualizar(item: ItemPedido, editado: CampoEditado, valor: string) {
    setCampos((prev) => {
      const atual = prev[item.id] ?? camposDoItem(item);
      return {
        ...prev,
        [item.id]: sincronizar({ ...atual, [editado]: valor }, item.unidade_medida, editado),
      };
    });
    setSaved(false);
  }

  const linhas = useMemo(
    () =>
      itens.map((item) => {
        const campo = campos[item.id] ?? camposDoItem(item);
        const quantidadeReal = num(campo.quantidade);
        const precoReal = num(campo.preco);
        const valido =
          quantidadeReal !== null && precoReal !== null && quantidadeReal > 0 && precoReal >= 0;

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
  const valorManualDigitado = num(valorManual);

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
        valorManualDigitado
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
      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          Registre o que saiu de cada item — peso, quantidade e preço são por item.
        </p>
        <DicaCamposLigados unidade={itens[0]?.unidade_medida ?? "peso_kg"} />
      </div>

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
                    step="0.0001"
                    min="0"
                    value={campo.preco}
                    onChange={(e) => atualizar(item, "preco", e.target.value)}
                    placeholder="Ex: 80.00"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div>
                <label className="label">Valor do item (R$)</label>
                <input
                  className="input bg-white"
                  type="number"
                  step="0.01"
                  min="0"
                  value={campo.valor}
                  onChange={(e) => atualizar(item, "valor", e.target.value)}
                  placeholder="Ex: 150.00"
                  disabled={isPending}
                />
              </div>

              {calculo?.aplicouCorte && calculo.limite !== null && (
                <p className="text-[10px] text-orange-600 flex items-start gap-1">
                  <AlertTriangle size={11} className="flex-shrink-0 mt-px" />
                  Excede o pedido em mais de {LIMITE_EXTRA_KG * 1000}g — cobrado{" "}
                  {formatCurrency(calculo.valorAjustado)}, até {calculo.limite.toFixed(2)} kg
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
        {valorManualDigitado !== null && (
          <p className="text-xs text-brand-600 mt-1 font-medium">
            Valor a cobrar: {formatCurrency(valorManualDigitado)}
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
  const [campos, setCampos] = useState<CamposItem>(() =>
    camposDe("peso_kg", derivarPesoReal(pedido), pedido.preco_por_kg?.toString() ?? "")
  );
  const [valorManual, setValorManual] = useState(pedido.preco_corrigido?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function atualizar(editado: CampoEditado, valor: string) {
    setCampos((prev) => sincronizar({ ...prev, [editado]: valor }, "peso_kg", editado));
    setSaved(false);
  }

  const pesoPedido = pedido.peso ?? 0;
  const pesoRealNum = num(campos.quantidade);
  const precoKgNum = num(campos.preco);

  const calculo =
    pesoRealNum !== null && precoKgNum !== null && pesoRealNum > 0 && precoKgNum >= 0
      ? precificarItem({
          unidade: "peso_kg",
          quantidadePedida: pesoPedido > 0 ? pesoPedido : null,
          quantidadeReal: pesoRealNum,
          precoUnitario: precoKgNum,
        })
      : null;

  const valorManualNum = num(valorManual);
  const canSave = calculo !== null;

  function handleSave() {
    if (!calculo) return;
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await salvarPrecificacaoAction(
        pedido.id,
        precoKgNum,
        calculo.valorTotal,
        calculo.valorAjustado,
        valorManualNum
      );
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-4">
      <DicaCamposLigados unidade="peso_kg" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Peso real (kg)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={campos.quantidade}
            onChange={(e) => atualizar("quantidade", e.target.value)}
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
            step="0.0001"
            min="0"
            value={campos.preco}
            onChange={(e) => atualizar("preco", e.target.value)}
            placeholder="Ex: 80.00"
          />
        </div>
      </div>

      <CampoValor
        label="Valor total (R$)"
        valor={campos.valor}
        onChange={(valor) => atualizar("valor", valor)}
      />

      {calculo && (
        <div className={`rounded-lg border p-3 space-y-0.5 ${calculo.aplicouCorte ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-50"}`}>
          <div className="flex items-center gap-1.5">
            {calculo.aplicouCorte && <AlertTriangle size={13} className="text-orange-500 flex-shrink-0" />}
            <p className={`text-xs font-medium ${calculo.aplicouCorte ? "text-orange-700" : "text-gray-500"}`}>
              Valor ajustado {calculo.aplicouCorte ? "(regra +300g aplicada)" : "(igual ao total)"}
            </p>
          </div>
          <p className={`text-lg font-bold ${calculo.aplicouCorte ? "text-orange-800" : "text-gray-800"}`}>
            {formatCurrency(calculo.valorAjustado)}
          </p>
          {calculo.aplicouCorte && calculo.limite !== null && (
            <p className="text-[10px] text-orange-600">
              Peso real ({pesoRealNum} kg) excede o pedido em mais de 300g — cobrado até{" "}
              {calculo.limite.toFixed(2)} kg × {formatCurrency(precoKgNum)}
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
  const [campos, setCampos] = useState<CamposItem>(() =>
    camposDe("unidade", derivarQtdReal(pedido), pedido.preco_por_kg?.toString() ?? "")
  );
  const [valorManual, setValorManual] = useState(pedido.preco_corrigido?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function atualizar(editado: CampoEditado, valor: string) {
    setCampos((prev) => sincronizar({ ...prev, [editado]: valor }, "unidade", editado));
    setSaved(false);
  }

  const qtdNum = num(campos.quantidade);
  const precoUnNum = num(campos.preco);
  const valorCalculado =
    qtdNum !== null && precoUnNum !== null && qtdNum > 0 && precoUnNum >= 0
      ? calcularTotalItem(qtdNum, precoUnNum, "unidade")
      : null;
  const valorManualNum = num(valorManual);

  const canSave = valorCalculado !== null;

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
      <DicaCamposLigados unidade="unidade" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Quantidade real</label>
          <input
            className="input"
            type="number"
            min="1"
            value={campos.quantidade}
            onChange={(e) => atualizar("quantidade", e.target.value)}
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
            step="0.0001"
            min="0"
            value={campos.preco}
            onChange={(e) => atualizar("preco", e.target.value)}
            placeholder="Ex: 4.50"
          />
        </div>
      </div>

      <CampoValor
        label="Valor total (R$)"
        valor={campos.valor}
        onChange={(valor) => atualizar("valor", valor)}
      />

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

  const valorNum = num(valorKit);
  const canSave = valorNum !== null;

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
