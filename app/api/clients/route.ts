import { getAuthenticatedClient } from '@/lib/auth';
import { criarCliente, listarClientes } from '@/services/client-service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const client = await getAuthenticatedClient(request);
    const clientes = await listarClientes(client);
    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const client = await getAuthenticatedClient(request);
    const body = (await request.json()) as { nome?: string; telefone?: string };

    if (!body.nome || !body.telefone) {
      return NextResponse.json({ message: 'nome e telefone são obrigatórios.' }, { status: 400 });
    }

    const cliente = await criarCliente(client, body.nome, body.telefone);
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}
