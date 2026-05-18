"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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

  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
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

  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
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

  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
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

  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${pedidoId}`);
  return {};
}

export async function salvarEntregaAction(
  pedidoId: string,
  valorCobrado: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ valor_cobrado: valorCobrado })
    .eq("id", pedidoId);

  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${pedidoId}`);
  return {};
}
