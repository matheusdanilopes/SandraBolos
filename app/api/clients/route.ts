import { criarCliente, listarClientes } from '@/services/client-service';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clientes = await listarClientes();
    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { nome?: string; telefone?: string };

    if (!body.nome || !body.telefone) {
      return NextResponse.json({ message: 'nome e telefone são obrigatórios.' }, { status: 400 });
    }

    const cliente = await criarCliente(body.nome, body.telefone);
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
