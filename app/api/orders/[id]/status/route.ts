import type { OrderStatus } from '@/lib/types';
import { atualizarStatusPedido } from '@/services/order-service';
import { NextResponse } from 'next/server';

const validStatus: OrderStatus[] = ['pendente', 'em_producao', 'entregue'];

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = (await request.json()) as { status?: OrderStatus };

    if (!body.status || !validStatus.includes(body.status)) {
      return NextResponse.json({ message: 'Status inválido.' }, { status: 400 });
    }

    await atualizarStatusPedido(params.id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
