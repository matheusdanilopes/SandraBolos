import { isSameDay, isWithinInterval, parseISO } from "date-fns";
import { semanaDe } from "./calendario";
import { calcularValorFinal } from "./utils";
import type { PedidoCalendario, PedidoComCliente } from "@/types/database";

export interface ProximaEntrega {
  id: string;
  nome: string;
  hora: string | null;
}

/**
 * O que a confeiteira precisa saber sobre uma janela de entregas: quanto ainda
 * tem trabalho pela frente, quanto disso já está pronto, quanto falta produzir
 * e quanto dinheiro entra quando tudo for entregue.
 *
 * Contar pedidos sozinho não diz nada — 4 entregas podem ser 4 bolos prontos na
 * geladeira ou 12 kg para assar hoje à noite.
 */
export interface ResumoEntregas {
  /** Entregas previstas na janela, incluindo as que já saíram. */
  total: number;
  entregues: number;
  pendentes: number;
  /** Pendentes ainda em "novo" ou "produzindo". */
  aProduzir: number;
  /** Pendentes já em "feito", só esperando a entrega. */
  prontos: number;
  /** Soma dos valores das entregas pendentes da janela. */
  valorPendente: number;
  /** Carga que ainda falta sair do forno, separada pela unidade de cada pedido. */
  pesoAProduzir: number;
  unidadesAProduzir: number;
  proxima: ProximaEntrega | null;
}

function horaDoPedido(pedido: {
  hora_entrega: string | null;
  hora_retirada: string | null;
}): string | null {
  return pedido.hora_entrega || pedido.hora_retirada || null;
}

function nomeDoPedido(pedido: {
  nome_cliente: string | null;
  clientes?: { nome: string } | null;
}): string {
  return pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente";
}

/**
 * Resume as entregas de uma janela de datas.
 *
 * `ativos` são os pedidos que ainda dão trabalho (sem rascunho, entregue ou
 * cancelado) e `calendario` traz também os entregues — usados só para dizer
 * quanto da janela já saiu.
 */
export function resumirEntregas(
  ativos: PedidoComCliente[],
  calendario: PedidoCalendario[],
  naJanela: (dataEntrega: string) => boolean
): ResumoEntregas {
  const pendentes = ativos.filter((p) => naJanela(p.data_entrega));

  let aProduzir = 0;
  let prontos = 0;
  let valorPendente = 0;
  let pesoAProduzir = 0;
  let unidadesAProduzir = 0;

  for (const pedido of pendentes) {
    valorPendente += calcularValorFinal(pedido) ?? 0;

    if (pedido.status === "feito") {
      prontos += 1;
      continue;
    }

    aProduzir += 1;
    pesoAProduzir += pedido.peso ?? 0;
    unidadesAProduzir += pedido.quantidade ?? 0;
  }

  const entregues = calendario.filter(
    (p) => p.status === "entregue" && naJanela(p.data_entrega)
  ).length;

  return {
    total: pendentes.length + entregues,
    entregues,
    pendentes: pendentes.length,
    aProduzir,
    prontos,
    valorPendente,
    pesoAProduzir,
    unidadesAProduzir,
    proxima: proximaEntrega(pendentes),
  };
}

/** A entrega mais próxima no tempo — sem hora marcada vai para o fim do dia. */
export function proximaEntrega(pedidos: PedidoComCliente[]): ProximaEntrega | null {
  let escolhido: PedidoComCliente | null = null;
  let chaveEscolhida = "";

  for (const pedido of pedidos) {
    const chave = `${pedido.data_entrega} ${horaDoPedido(pedido) ?? "99:99"}`;
    if (!escolhido || chave < chaveEscolhida) {
      escolhido = pedido;
      chaveEscolhida = chave;
    }
  }

  if (!escolhido) return null;
  return {
    id: escolhido.id,
    nome: nomeDoPedido(escolhido),
    hora: horaDoPedido(escolhido),
  };
}

export function resumoDeHoje(
  ativos: PedidoComCliente[],
  calendario: PedidoCalendario[],
  hoje = new Date()
): ResumoEntregas {
  return resumirEntregas(ativos, calendario, (data) =>
    isSameDay(parseISO(data), hoje)
  );
}

export function resumoDaSemana(
  ativos: PedidoComCliente[],
  calendario: PedidoCalendario[],
  hoje = new Date()
): ResumoEntregas {
  const { inicio, fim } = semanaDe(hoje);
  return resumirEntregas(ativos, calendario, (data) =>
    isWithinInterval(parseISO(data), { start: inicio, end: fim })
  );
}
