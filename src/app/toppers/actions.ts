"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

interface TopperPayload {
  pedidoId: string;
  fornecedor?: string;
  valor: number;
  frete: number;
  observacoes?: string;
}

export async function salvarTopperAction(data: TopperPayload): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("toppers_pedido")
    .upsert(
      {
        pedido_id: data.pedidoId,
        fornecedor: data.fornecedor || null,
        valor: data.valor,
        frete: data.frete,
        observacoes: data.observacoes || null,
      },
      { onConflict: "pedido_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/toppers");
  return {};
}

export async function toggleSolicitadoAction(
  pedidoId: string,
  solicitado: boolean
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("toppers_pedido")
    .select("id")
    .eq("pedido_id", pedidoId)
    .single();

  if (!existing) {
    const { error } = await supabase
      .from("toppers_pedido")
      .insert({ pedido_id: pedidoId, solicitado, valor: 0, frete: 0 });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("toppers_pedido")
      .update({ solicitado })
      .eq("pedido_id", pedidoId);
    if (error) return { error: error.message };
  }

  revalidatePath("/toppers");
  return {};
}

export async function toggleRecebidoAction(
  pedidoId: string,
  recebido: boolean
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("toppers_pedido")
    .select("id")
    .eq("pedido_id", pedidoId)
    .single();

  if (!existing) {
    const { error } = await supabase
      .from("toppers_pedido")
      .insert({ pedido_id: pedidoId, recebido, valor: 0, frete: 0 });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("toppers_pedido")
      .update({ recebido })
      .eq("pedido_id", pedidoId);
    if (error) return { error: error.message };
  }

  revalidatePath("/toppers");
  return {};
}

export async function togglePagoFornecedorAction(
  pedidoId: string,
  pago_fornecedor: boolean
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("toppers_pedido")
    .select("id")
    .eq("pedido_id", pedidoId)
    .single();

  if (!existing) {
    const { error } = await supabase
      .from("toppers_pedido")
      .insert({ pedido_id: pedidoId, pago_fornecedor, valor: 0, frete: 0 });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("toppers_pedido")
      .update({ pago_fornecedor })
      .eq("pedido_id", pedidoId);
    if (error) return { error: error.message };
  }

  revalidatePath("/toppers");
  return {};
}
