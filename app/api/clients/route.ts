import { getAuthenticatedClient } from '@/lib/auth';
import { createServiceSupabaseClient } from '@/lib/supabase';
import { criarCliente, listarClientes } from '@/services/client-service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const authClient = await getAuthenticatedClient(request);
    const dbClient = createServiceSupabaseClient() ?? authClient;

    const clientes = await listarClientes(dbClient);
    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await getAuthenticatedClient(request);
    const dbClient = createServiceSupabaseClient() ?? authClient;

    const body = (await request.json()) as { nome?: string; telefone?: string };

    if (!body.nome || !body.telefone) {
      return NextResponse.json({ message: 'nome e telefone são obrigatórios.' }, { status: 400 });
    }

    const cliente = await criarCliente(dbClient, body.nome, body.telefone);
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}
