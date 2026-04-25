"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { TipoCusto } from "@/types/database";

export async function criarCustoAction(data: {
  descricao: string;
  valor: number;
  tipo: TipoCusto;
  data: string;
  pedido_id?: string | null;
}): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("custos").insert({
    descricao: data.descricao,
    valor: data.valor,
    tipo: data.tipo,
    data: data.data,
    pedido_id: data.pedido_id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  if (data.pedido_id) revalidatePath(`/pedidos/${data.pedido_id}`);
  return {};
}

export async function deletarCustoAction(
  custoId: string,
  pedidoId?: string | null
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("custos").delete().eq("id", custoId);

  if (error) return { error: error.message };

  revalidatePath("/financeiro");
  if (pedidoId) revalidatePath(`/pedidos/${pedidoId}`);
  return {};
}
