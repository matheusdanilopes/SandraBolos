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

export async function registrarPagamentoAction(
  pedidoId: string,
  dataPagamento: string
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
      .insert({
        pedido_id: pedidoId,
        pago_fornecedor: true,
        data_pagamento: dataPagamento,
        valor: 0,
        frete: 0,
      });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("toppers_pedido")
      .update({ pago_fornecedor: true, data_pagamento: dataPagamento })
      .eq("pedido_id", pedidoId);
    if (error) return { error: error.message };
  }

  revalidatePath("/toppers");
  return {};
}

export async function desfazerPagamentoAction(
  pedidoId: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("toppers_pedido")
    .update({ pago_fornecedor: false, data_pagamento: null })
    .eq("pedido_id", pedidoId);

  if (error) return { error: error.message };
  revalidatePath("/toppers");
  return {};
}

export async function registrarPagamentoLoteAction(
  pedidoIds: string[],
  dataPagamento: string
): Promise<{ error?: string }> {
  if (pedidoIds.length === 0) return {};
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("toppers_pedido")
    .update({ pago_fornecedor: true, data_pagamento: dataPagamento })
    .in("pedido_id", pedidoIds);

  if (error) return { error: error.message };
  revalidatePath("/toppers");
  return {};
}
