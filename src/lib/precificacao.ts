import type { UnidadeMedida } from "@/types/database";

/**
 * Folga de peso que não é cobrada.
 *
 * Bolo é feito à mão e quase nunca fecha no peso exato. Até 300g acima do
 * combinado a diferença é por conta da casa; acima disso a cobrança para no
 * limite, para o cliente não ser surpreendido por um bolo que saiu bem maior
 * do que ele pediu.
 */
export const LIMITE_EXTRA_KG = 0.3;

/** Arredonda para centavos — o valor gravado é dinheiro, não fração de conta. */
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Valor de um item pela unidade de medida do produto.
 *
 * - `peso_kg`: decimal × valor/kg   (1,5 kg × R$80 = R$120)
 * - `cento`: proporcional ao cento  (50 un. = 0,5 × R$80 = R$40)
 * - `unidade`: inteiro × valor unitário
 */
export function calcularTotalItem(
  quantidade: number,
  precoUnitario: number,
  unidade: UnidadeMedida
): number {
  switch (unidade) {
    case "peso_kg":
      return centavos(quantidade * precoUnitario);
    case "cento":
      return centavos((quantidade / 100) * precoUnitario);
    case "unidade":
      return centavos(Math.round(quantidade) * precoUnitario);
  }
}

/**
 * Caminho de volta: o preço unitário que faz a conta fechar no valor informado.
 *
 * É o mesmo cálculo de `calcularTotalItem` ao contrário — quem já combinou o
 * valor com a cliente ("esse bolo sai por R$ 150") precisa saber em quanto fica
 * o kg, e não o contrário. Quatro casas porque `preco_unitario` é
 * `numeric(10,4)`: R$ 150 em 1,8 kg dá R$ 83,3333/kg, e arredondar para
 * centavos aqui faria o valor de volta não bater com o que foi digitado.
 *
 * `null` quando não há como dividir (quantidade ausente ou zerada).
 */
export function precoUnitarioDoValor(
  valorTotal: number,
  quantidade: number,
  unidade: UnidadeMedida
): number | null {
  const base =
    unidade === "cento" ? quantidade / 100 : unidade === "unidade" ? Math.round(quantidade) : quantidade;
  if (!base || base <= 0) return null;
  return Math.round((valorTotal / base) * 10000) / 10000;
}

export interface ItemPrecificado {
  /** Quanto daria a conta pelo que foi apurado, sem nenhum corte. */
  valorTotal: number;
  /** O que entra no pedido: igual ao total, ou cortado pela regra dos 300g. */
  valorAjustado: number;
  /** Peso/quantidade efetivamente cobrado — menor que o real quando há corte. */
  quantidadeCobrada: number;
  aplicouCorte: boolean;
  /** Teto de cobrança do item (kg). `null` quando a regra não se aplica. */
  limite: number | null;
}

/**
 * Apuração de um item no "Feito".
 *
 * A regra dos 300g só vale para item vendido por peso e só faz sentido com uma
 * quantidade combinada para comparar: sem ela (item lançado direto na produção)
 * o que foi apurado é o que se cobra.
 */
export function precificarItem(params: {
  unidade: UnidadeMedida;
  /** Quantidade combinada na venda — referência do teto de cobrança. */
  quantidadePedida: number | null;
  quantidadeReal: number;
  precoUnitario: number;
}): ItemPrecificado {
  const { unidade, quantidadePedida, quantidadeReal, precoUnitario } = params;

  const valorTotal = calcularTotalItem(quantidadeReal, precoUnitario, unidade);
  const limite =
    unidade === "peso_kg" && quantidadePedida && quantidadePedida > 0
      ? quantidadePedida + LIMITE_EXTRA_KG
      : null;
  const aplicouCorte = limite !== null && quantidadeReal > limite;
  const quantidadeCobrada = aplicouCorte ? limite! : quantidadeReal;

  return {
    valorTotal,
    valorAjustado: aplicouCorte
      ? calcularTotalItem(quantidadeCobrada, precoUnitario, unidade)
      : valorTotal,
    quantidadeCobrada,
    aplicouCorte,
    limite,
  };
}

/** Soma em centavos — evita o resíduo de ponto flutuante do acumulado. */
export function somarValores(valores: number[]): number {
  return centavos(valores.reduce((total, valor) => total + valor, 0));
}

export function formatQuantidade(quantidade: number, unidade: UnidadeMedida): string {
  if (unidade === "peso_kg") return `${quantidade.toFixed(3)} kg`;
  return `${Math.round(quantidade)} un.`;
}

export function labelQuantidade(unidade: UnidadeMedida): string {
  return unidade === "peso_kg" ? "Peso real (kg)" : "Quantidade real";
}

export function labelPreco(unidade: UnidadeMedida): string {
  if (unidade === "peso_kg") return "Preço/kg (R$)";
  if (unidade === "cento") return "Preço do cento (R$)";
  return "Preço unitário (R$)";
}

export function inputQuantidade(unidade: UnidadeMedida) {
  if (unidade === "peso_kg") return { step: "0.001", min: "0", placeholder: "Ex: 1,500" };
  return { step: "1", min: "0", placeholder: "Ex: 50" };
}
