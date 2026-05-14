"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function adicionarItemAction(
  pedidoId: string,
  data: {
    produtoId: string;
    nomeProduto: string;
    unidadeMedida: string;
    precoUnitario: number;
    quantidade: number;
    valorTotal: number;
  }
): Promise<{ error?: string }> {
  if (data.quantidade <= 0) return { error: "Quantidade inválida" };
  if (data.precoUnitario < 0) return { error: "Preço inválido" };

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("itens_pedido").insert({
    pedido_id: pedidoId,
    produto_id: data.produtoId,
    nome_produto: data.nomeProduto,
    unidade_medida: data.unidadeMedida,
    preco_unitario: data.precoUnitario,
    quantidade: data.quantidade,
    valor_total: Math.round(data.valorTotal * 100) / 100,
  });

  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${pedidoId}`);
  return {};
}

export async function removerItemAction(
  itemId: string,
  pedidoId: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("itens_pedido")
    .delete()
    .eq("id", itemId);

  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${pedidoId}`);
  return {};
}
