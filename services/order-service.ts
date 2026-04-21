import type { NovoPedidoInput, OrderStatus, Pedido } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function criarPedido(client: SupabaseClient, input: NovoPedidoInput): Promise<Pedido> {
  const { data: pedido, error: pedidoError } = await client
    .from('pedidos')
    .insert({
      cliente_id: input.cliente_id,
      data_entrega: input.data_entrega,
      valor: input.valor,
      status: input.status,
      observacoes: input.observacoes ?? null
    })
    .select('*')
    .single();

  if (pedidoError) throw new Error(`Erro ao criar pedido: ${pedidoError.message}`);

  if (input.itens.length > 0) {
    const { error: itensError } = await client.from('itens_pedido').insert(
      input.itens.map((item) => ({
        pedido_id: pedido.id,
        descricao: item.descricao,
        quantidade: item.quantidade,
        preco: item.preco
      }))
    );

    if (itensError) throw new Error(`Pedido criado, mas falha ao salvar itens: ${itensError.message}`);
  }

  return pedido;
}

export async function listarPedidos(client: SupabaseClient): Promise<Pedido[]> {
  const { data, error } = await client
    .from('pedidos')
    .select('*, cliente:clientes(id, nome, telefone)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao listar pedidos: ${error.message}`);
  return data;
}

export async function atualizarStatusPedido(client: SupabaseClient, id: string, status: OrderStatus): Promise<void> {
  const { error } = await client.from('pedidos').update({ status }).eq('id', id);
  if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
}
