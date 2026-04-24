"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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

export async function salvarPrecificacaoAction(
  pedidoId: string,
  precoPorKg: number | null,
  valorCalculado: number | null,
  precoCorrigido: number | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ preco_por_kg: precoPorKg, valor_calculado: valorCalculado, preco_corrigido: precoCorrigido })
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
