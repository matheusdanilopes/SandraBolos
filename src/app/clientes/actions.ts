"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

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

  if (error) return { error: error.message };

  revalidatePath("/clientes");
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

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  redirect(`/clientes/${clienteId}`);
}
