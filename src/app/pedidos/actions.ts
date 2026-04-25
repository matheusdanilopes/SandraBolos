"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { TipoPedido, Topper } from "@/types/database";

interface PedidoPayload {
  clienteId?: string;
  novoClienteNome?: string;
  novoClienteTelefone?: string;
  tipo: TipoPedido;
  dataEntrega: string;
  horaEntrega?: string | null;
  horaRetirada?: string | null;
  descricao?: string;
  topper: Topper;
  peso?: number | null;
  quantidade?: number | null;
}

export async function criarPedidoAction(
  data: PedidoPayload
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  let resolvedClienteId: string | null = data.clienteId || null;

  if (!resolvedClienteId) {
    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .insert({ nome: data.novoClienteNome!, telefone: data.novoClienteTelefone! })
      .select()
      .single();
    if (clienteError) return { error: clienteError.message };
    resolvedClienteId = clienteData.id;
    revalidatePath("/clientes");
  }

  const { data: novoPedido, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: resolvedClienteId,
      data_entrega: data.dataEntrega,
      hora_entrega: data.horaEntrega ?? null,
      hora_retirada: data.horaRetirada ?? null,
      tipo: data.tipo,
      descricao: data.descricao || null,
      topper: data.topper,
      peso: data.peso ?? null,
      quantidade: data.quantidade ?? null,
      status: "novo",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/pedidos");
  revalidatePath("/");
  redirect(`/pedidos/${novoPedido.id}`);
}

export async function editarPedidoAction(
  pedidoId: string,
  data: Pick<PedidoPayload, "tipo" | "dataEntrega" | "horaEntrega" | "horaRetirada" | "descricao" | "topper" | "peso" | "quantidade">
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({
      data_entrega: data.dataEntrega,
      hora_entrega: data.horaEntrega ?? null,
      hora_retirada: data.horaRetirada ?? null,
      tipo: data.tipo,
      descricao: data.descricao || null,
      topper: data.topper,
      peso: data.peso ?? null,
      quantidade: data.quantidade ?? null,
    })
    .eq("id", pedidoId);

  if (error) return { error: error.message };

  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  revalidatePath("/");
  redirect(`/pedidos/${pedidoId}`);
}
