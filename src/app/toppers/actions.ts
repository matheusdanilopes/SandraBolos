"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { mensagemErro } from "@/lib/erros";
import type { EtapaTopper } from "@/types/database";

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

  if (error) return { error: mensagemErro(error) };
  revalidatePath("/toppers");
  revalidatePath("/financeiro");
  return {};
}

/**
 * Etapas do topper encomendado, na ordem em que acontecem na vida real:
 * pedir ao fornecedor → receber em mãos.
 *
 * Antes cada etapa era um booleano solto, ligado/desligado por conta própria —
 * dava para marcar "recebido" um topper que nunca foi solicitado, e a tela
 * ficava contando esse pedido como pendente. Gravar as duas de uma vez mantém o
 * estado sempre coerente: avançar marca tudo que veio antes, voltar desmarca
 * tudo que vem depois.
 */
const FLAGS_POR_ETAPA: Record<EtapaTopper, { solicitado: boolean; recebido: boolean }> = {
  pendente: { solicitado: false, recebido: false },
  solicitado: { solicitado: true, recebido: false },
  recebido: { solicitado: true, recebido: true },
};

export async function definirEtapaTopperAction(
  pedidoId: string,
  etapa: EtapaTopper
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const flags = FLAGS_POR_ETAPA[etapa];

  const { data: existing } = await supabase
    .from("toppers_pedido")
    .select("id")
    .eq("pedido_id", pedidoId)
    .single();

  if (!existing) {
    const { error } = await supabase
      .from("toppers_pedido")
      .insert({ pedido_id: pedidoId, ...flags, valor: 0, frete: 0 });
    if (error) return { error: mensagemErro(error) };
  } else {
    const { error } = await supabase
      .from("toppers_pedido")
      .update(flags)
      .eq("pedido_id", pedidoId);
    if (error) return { error: mensagemErro(error) };
  }

  revalidatePath("/toppers");
  revalidatePath("/financeiro");
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
    if (error) return { error: mensagemErro(error) };
  } else {
    const { error } = await supabase
      .from("toppers_pedido")
      .update({ pago_fornecedor: true, data_pagamento: dataPagamento })
      .eq("pedido_id", pedidoId);
    if (error) return { error: mensagemErro(error) };
  }

  revalidatePath("/toppers");
  revalidatePath("/financeiro");
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

  if (error) return { error: mensagemErro(error) };
  revalidatePath("/toppers");
  revalidatePath("/financeiro");
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

  if (error) return { error: mensagemErro(error) };
  revalidatePath("/toppers");
  revalidatePath("/financeiro");
  return {};
}
