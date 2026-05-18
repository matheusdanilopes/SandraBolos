"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { TipoPedido, Topper } from "@/types/database";

interface ItemPayload {
  produtoId: string;
  nomeProduto: string;
  unidadeMedida: string;
  precoUnitario: number;
  quantidade: number;
  valorTotal: number;
}

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
  itens?: ItemPayload[];
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

  if (data.itens && data.itens.length > 0) {
    await supabase.from("itens_pedido").insert(
      data.itens.map((item) => ({
        pedido_id: novoPedido.id,
        produto_id: item.produtoId,
        nome_produto: item.nomeProduto,
        unidade_medida: item.unidadeMedida,
        preco_unitario: item.precoUnitario,
        quantidade: item.quantidade,
        valor_total: Math.round(item.valorTotal * 100) / 100,
      }))
    );
  }

  revalidatePath("/pedidos");
  revalidatePath("/");
  redirect(`/pedidos/${novoPedido.id}`);
}

export async function excluirRascunhoAction(
  pedidoId: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: pedido, error: fetchError } = await supabase
    .from("pedidos")
    .select("status")
    .eq("id", pedidoId)
    .single();

  if (fetchError || !pedido) return { error: "Pedido não encontrado" };
  if (pedido.status !== "rascunho") return { error: "Apenas rascunhos podem ser excluídos" };

  await supabase.from("itens_pedido").delete().eq("pedido_id", pedidoId);
  await supabase.from("imagens_pedido").delete().eq("pedido_id", pedidoId);
  await supabase.from("toppers_pedido").delete().eq("pedido_id", pedidoId);

  const { error } = await supabase.from("pedidos").delete().eq("id", pedidoId);
  if (error) return { error: error.message };

  revalidatePath("/pedidos");
  revalidatePath("/");
  return {};
}

export async function criarPedidoRapidoAction(data: {
  nomeCliente: string;
  descricao?: string;
  valorEstimado?: number;
  dataEntrega?: string;
}): Promise<{ pedidoId?: string; error?: string }> {
  const supabase = createServerSupabaseClient();

  const hoje = new Date().toISOString().split("T")[0];

  const { data: novoPedido, error } = await supabase
    .from("pedidos")
    .insert({
      nome_cliente: data.nomeCliente.trim(),
      data_entrega: data.dataEntrega || hoje,
      tipo: "bolo",
      descricao: data.descricao?.trim() || null,
      topper: "nao",
      preco_corrigido: data.valorEstimado ?? null,
      status: "rascunho",
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/pedidos");
  revalidatePath("/");

  return { pedidoId: novoPedido.id };
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
