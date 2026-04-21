import { supabaseAdmin } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

export async function criarCliente(nome: string, telefone: string): Promise<Cliente> {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .insert({ nome, telefone })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Erro ao criar cliente: ${error.message}`);
  }

  return data;
}

export async function listarClientes(): Promise<Cliente[]> {
  const { data, error } = await supabaseAdmin.from('clientes').select('*').order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao listar clientes: ${error.message}`);
  }

  return data;
}
