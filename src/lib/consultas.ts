// Colunas e recortes usados nas consultas de lista.
//
// Duas coisas moram aqui:
//
//  1. As colunas que cada tela realmente desenha. `select("*")` numa lista de
//     pedidos traz também preço por kg, valor cobrado, id da pasta do Drive e
//     companhia — campos que nenhuma dessas telas mostra, baixados a cada
//     abertura, no 4G.
//
//  2. O recorte de histórico da tela de Pedidos, que sem nenhum limite carrega
//     o banco inteiro e só cresce (ver `filtroDeHistorico`).
//
// As listas são escritas como literais de propósito: o `select()` do
// supabase-js é tipado em cima do texto da consulta, e uma string montada em
// tempo de execução faria o tipo do resultado virar erro de parser.

import { format, startOfMonth, subMonths } from "date-fns";
import type { StatusPedido } from "@/types/database";

// ─── Colunas ──────────────────────────────────────────────────────────────────

/** Tela de Pedidos: lista e calendário (os três valores alimentam calcularValorFinal). */
export const COLUNAS_PEDIDO_LISTA =
  "id, status, tipo, data_entrega, hora_entrega, hora_retirada, peso, quantidade, descricao, nome_cliente, valor_calculado, preco_corrigido, valor_brinde";

/** Dashboard: mostra o número do pedido (created_at) e não mostra a descrição. */
export const COLUNAS_PEDIDO_PAINEL =
  "id, status, tipo, data_entrega, hora_entrega, hora_retirada, peso, quantidade, nome_cliente, created_at, valor_calculado, preco_corrigido, valor_brinde";

/** Tela de Toppers: o pedido entra só como cabeçalho do card. */
export const COLUNAS_PEDIDO_TOPPER =
  "id, status, topper, data_entrega, nome_cliente, created_at";

/** Ficha do topper, sem as chaves e carimbos que a tela não usa. */
export const COLUNAS_TOPPER_PEDIDO =
  "fornecedor, valor, frete, solicitado, recebido, pago_fornecedor, data_pagamento, observacoes";

export const COLUNAS_PRODUTO =
  "id, nome, descricao, unidade_medida, preco_padrao, ativo, categoria_id";

export const COLUNAS_CLIENTE = "id, nome, telefone";

// ─── Recorte de histórico da tela de Pedidos ─────────────────────────────────

/** Meses de histórico já encerrado que a tela de Pedidos carrega por padrão. */
export const MESES_DE_HISTORICO = 12;

/** Status de pedido encerrado — é só o que envelhece e sai do recorte padrão. */
const STATUS_ENCERRADOS: StatusPedido[] = ["entregue", "cancelado"];

const STATUS_EM_ABERTO: StatusPedido[] = (
  ["rascunho", "novo", "produzindo", "feito", "entregue", "cancelado"] as StatusPedido[]
).filter((s) => !STATUS_ENCERRADOS.includes(s));

/** Primeiro dia do mês a partir do qual o histórico encerrado é carregado. */
export function inicioDoHistorico(meses: number = MESES_DE_HISTORICO): string {
  return format(startOfMonth(subMonths(new Date(), meses)), "yyyy-MM-dd");
}

/**
 * Filtro do recorte padrão da tela de Pedidos, no formato `or` do PostgREST.
 *
 * A lista buscava todos os pedidos de toda a história a cada abertura, sem
 * limite — uma conta que só cresce e que o celular paga inteira.
 *
 * O corte é por idade do que já acabou, não por quantidade: pedido em aberto
 * entra sempre, por mais antigo que seja, senão um atrasado de um ano sumiria
 * justamente do filtro "Atrasados". Sai só entrega ou cancelamento mais velho
 * que a janela — e a tela oferece o histórico completo num toque.
 */
export function filtroDeHistorico(meses: number = MESES_DE_HISTORICO): string {
  return [
    `status.in.(${STATUS_EM_ABERTO.join(",")})`,
    `data_entrega.gte.${inicioDoHistorico(meses)}`,
  ].join(",");
}
