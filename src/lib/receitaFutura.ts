import { calcularValorFinal } from "./utils";
import type { StatusPedido } from "@/types/database";

/**
 * Etapas de um pedido confirmado que ainda não saiu: é o dinheiro que vai
 * entrar quando ele for entregue. Rascunho fica de fora — ainda não é pedido
 * fechado — e cancelado não entra mais.
 */
export const STATUS_PREVISTOS: StatusPedido[] = ["novo", "produzindo", "feito"];

type PedidoPrevisto = Parameters<typeof calcularValorFinal>[0] & {
  status: StatusPedido;
  data_entrega: string;
};

export interface ResumoPrevisto {
  /** Soma do valor dos pedidos previstos; os sem valor contam zero. */
  total: number;
  quantidade: number;
  semValor: number;
  /** Já em "feito", só esperando a entrega. */
  prontos: { quantidade: number; valor: number };
  /** Data de entrega já passou e o pedido não foi marcado como entregue. */
  atrasados: { quantidade: number; valor: number };
}

/**
 * Pedidos confirmados com entrega entre `inicio` e `fim` (yyyy-MM-dd).
 *
 * A data de entrega é a mesma que a receita realizada usa: assim o previsto de
 * um mês e o que entrou nele somam o mês inteiro, sem pedido contado duas vezes.
 */
export function pedidosPrevistos<T extends PedidoPrevisto>(
  pedidos: T[],
  inicio: string,
  fim: string
): T[] {
  return pedidos.filter(
    (p) =>
      STATUS_PREVISTOS.includes(p.status) &&
      p.data_entrega >= inicio &&
      p.data_entrega <= fim
  );
}

/** Resume pedidos já filtrados por `pedidosPrevistos`. `hoje` em yyyy-MM-dd. */
export function resumirPrevisto(pedidos: PedidoPrevisto[], hoje: string): ResumoPrevisto {
  const resumo: ResumoPrevisto = {
    total: 0,
    quantidade: pedidos.length,
    semValor: 0,
    prontos: { quantidade: 0, valor: 0 },
    atrasados: { quantidade: 0, valor: 0 },
  };

  for (const pedido of pedidos) {
    const valor = calcularValorFinal(pedido);
    if (valor == null) resumo.semValor += 1;
    resumo.total += valor ?? 0;

    if (pedido.status === "feito") {
      resumo.prontos.quantidade += 1;
      resumo.prontos.valor += valor ?? 0;
    }
    if (pedido.data_entrega < hoje) {
      resumo.atrasados.quantidade += 1;
      resumo.atrasados.valor += valor ?? 0;
    }
  }

  return resumo;
}
