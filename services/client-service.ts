import type { Cliente } from '@/lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function criarCliente(client: SupabaseClient, nome: string, telefone: string): Promise<Cliente> {
  const { data, error } = await client.from('clientes').insert({ nome, telefone }).select('*').single();

  if (error) throw new Error(`Erro ao criar cliente: ${error.message}`);
  return data;
}

export async function listarClientes(client: SupabaseClient): Promise<Cliente[]> {
  const { data, error } = await client.from('clientes').select('*').order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao listar clientes: ${error.message}`);
  return data;
}
