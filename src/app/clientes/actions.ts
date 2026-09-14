"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { mensagemErro } from "@/lib/erros";
import type { Cliente } from "@/types/database";

/** Telas que mostram a lista de clientes e precisam saber de um cadastro novo. */
function revalidarTelasComClientes(clienteId?: string) {
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  // O seletor de cliente do pedido lê a mesma lista. Sem esta linha um cliente
  // recém-cadastrado não aparecia lá: `revalidatePath("/clientes")` não alcança
  // outras rotas, e /pedidos/novo continuava servindo o payload antigo.
  revalidatePath("/pedidos/novo");
}

export type ClienteOpcao = Pick<Cliente, "id" | "nome" | "telefone">;

/**
 * Lista de clientes para o seletor do pedido, buscada na hora.
 *
 * O formulário já recebe a lista renderizada no servidor, mas esse payload pode
 * vir do cache do roteador do Next (a rota fica guardada no navegador por algum
 * tempo depois da primeira visita). Quem acabou de cadastrar um cliente em
 * /clientes e volta para o pedido não pode ficar sem ele na lista — daí a
 * releitura ao abrir o formulário.
 */
export async function listarClientesAction(): Promise<{
  clientes?: ClienteOpcao[];
  error?: string;
}> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, telefone")
    .order("nome");

  if (error) return { error: mensagemErro(error) };
  return { clientes: (data ?? []) as ClienteOpcao[] };
}

export async function criarClienteAction(
  nome: string,
  telefone: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ nome, telefone })
    .select()
    .single();

  if (error) return { error: mensagemErro(error) };

  revalidarTelasComClientes();
  redirect(`/clientes/${data.id}`);
}

export async function editarClienteAction(
  clienteId: string,
  nome: string,
  telefone: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("clientes")
    .update({ nome, telefone })
    .eq("id", clienteId);

  if (error) return { error: mensagemErro(error) };

  revalidarTelasComClientes(clienteId);
  redirect(`/clientes/${clienteId}`);
}

/**
 * Apaga um cliente — apenas enquanto nenhum pedido apontar para ele.
 *
 * A coluna `cliente_id` do pedido é `on delete set null`: apagar um cliente com
 * pedidos não falha, ela só deixa os pedidos sem dono, com o histórico perdido
 * e sem telefone para chamar. Por isso a contagem vem antes da exclusão, e o
 * caminho para os demais é apagar ou cancelar os pedidos primeiro.
 */
export async function excluirClienteAction(
  clienteId: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { count, error: erroContagem } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId);

  // Sem saber quantos pedidos existem não dá para apagar: o risco é justamente
  // o de desamarrar pedidos de um cliente sem querer.
  if (erroContagem) return { error: mensagemErro(erroContagem) };
  if (count && count > 0) {
    return {
      error: `Este cliente tem ${count} pedido${count === 1 ? "" : "s"} vinculado${count === 1 ? "" : "s"}. Exclua ou cancele ${count === 1 ? "o pedido" : "os pedidos"} antes de excluir o cliente.`,
    };
  }

  const { error } = await supabase.from("clientes").delete().eq("id", clienteId);
  if (error) return { error: mensagemErro(error) };

  revalidarTelasComClientes(clienteId);
  return {};
}
