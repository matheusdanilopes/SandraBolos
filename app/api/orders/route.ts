import { getAuthenticatedClient } from '@/lib/auth';
import { criarPedido, listarPedidos } from '@/services/order-service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const client = await getAuthenticatedClient(request);
    const pedidos = await listarPedidos(client);
    return NextResponse.json(pedidos);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getAuthenticatedClient(request);
    const body = await request.json();

    if (!body.cliente_id || !body.data_entrega || !body.valor) {
      return NextResponse.json({ message: 'cliente_id, data_entrega e valor são obrigatórios.' }, { status: 400 });
    }

    const pedido = await criarPedido(client, {
      cliente_id: body.cliente_id,
      data_entrega: body.data_entrega,
      valor: Number(body.valor),
      status: body.status ?? 'pendente',
      observacoes: body.observacoes,
      itens: Array.isArray(body.itens) ? body.itens : []
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}
