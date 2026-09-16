"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { isErroDeConexao, mensagemErro } from "@/lib/erros";

const CANCELAVEIS = ["novo", "produzindo", "feito"];

export async function cancelarPedidoAction(
  pedidoId: string,
  motivo?: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: pedido, error: fetchError } = await supabase
    .from("pedidos")
    .select("status, descricao")
    .eq("id", pedidoId)
    .single();

  // Rede fora do ar não é pedido inexistente — dizer "não encontrado" aqui
  // faria parecer que o pedido sumiu do banco.
  if (isErroDeConexao(fetchError)) return { error: mensagemErro(fetchError) };
  if (fetchError || !pedido) return { error: "Pedido não encontrado" };
  if (!CANCELAVEIS.includes(pedido.status)) return { error: "Este pedido não pode ser cancelado" };

  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const nota = motivo?.trim()
    ? `[Cancelado em ${dataAtual} — Motivo: ${motivo.trim()}]`
    : `[Cancelado em ${dataAtual}]`;

  const novaDescricao = pedido.descricao
    ? `${nota}\n\n${pedido.descricao}`
    : nota;

  const { error } = await supabase
    .from("pedidos")
    .update({ status: "cancelado", descricao: novaDescricao })
    .eq("id", pedidoId);

  if (error) return { error: mensagemErro(error) };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  // O pedido cancelado sai da tela de Toppers; sem esta linha ele continuaria
  // lá, contado nos totais, até a próxima revalidação daquela rota.
  revalidatePath("/toppers");
  // E sai das contas do financeiro — receita, a receber e o topper a pagar.
  revalidatePath("/financeiro");
  revalidatePath("/");
  return {};
}

export async function avancarStatusAction(
  pedidoId: string,
  proximoStatus: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ status: proximoStatus })
    .eq("id", pedidoId);

  if (error) return { error: mensagemErro(error) };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  // "Feito" é o que está a receber e "entregue" é a receita: andar no fluxo
  // move dinheiro de uma coluna do financeiro para a outra.
  revalidatePath("/financeiro");
  revalidatePath("/");
  return {};
}

export async function voltarStatusAction(
  pedidoId: string,
  statusAnterior: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ status: statusAnterior })
    .eq("id", pedidoId);

  if (error) return { error: mensagemErro(error) };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  revalidatePath("/financeiro");
  revalidatePath("/");
  return {};
}

export async function salvarPrecificacaoAction(
  pedidoId: string,
  precoPorKg: number | null,
  valorCalculado: number | null,
  precoCorrigido: number | null,
  valorCobrado: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({
      preco_por_kg: precoPorKg,
      valor_calculado: valorCalculado,
      preco_corrigido: precoCorrigido,
      valor_cobrado: valorCobrado,
    })
    .eq("id", pedidoId);

  if (error) return { error: mensagemErro(error) };

  revalidatePath(`/pedidos/${pedidoId}`);
  // `valor_cobrado` é a receita do financeiro: sem revalidar, a tela continuava
  // mostrando o total anterior (e a entrega ainda como "sem valor").
  revalidatePath("/financeiro");
  revalidatePath("/");
  return {};
}

/** Mesma gravação de `valor_cobrado` do passo anterior, feita na entrega. */
export async function salvarEntregaAction(
  pedidoId: string,
  valorCobrado: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ valor_cobrado: valorCobrado })
    .eq("id", pedidoId);

  if (error) return { error: mensagemErro(error) };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/financeiro");
  revalidatePath("/");
  return {};
}

/**
 * Remove uma imagem de referência do pedido.
 *
 * Vive aqui, no servidor, e não no componente: importar o cliente Supabase
 * dentro de um componente "use client" arrastava o `@supabase/supabase-js`
 * inteiro para o bundle da tela de detalhe do pedido — dezenas de KB baixados
 * no celular só para apagar uma linha.
 */
export async function removerImagemAction(
  imagemId: string,
  pedidoId: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("imagens_pedido").delete().eq("id", imagemId);

  if (error) return { error: mensagemErro(error) };

  revalidatePath(`/pedidos/${pedidoId}`);
  return {};
}
