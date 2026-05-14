import { supabase } from "@/lib/supabase";
import { PedidoForm } from "../PedidoForm";
import type { Produto } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const [{ data: clientes }, { data: produtos }] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone").order("nome"),
    supabase.from("produtos").select("*").eq("ativo", true).order("nome"),
  ]);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Novo Pedido</h1>
      <PedidoForm clientes={clientes ?? []} produtos={(produtos ?? []) as Produto[]} />
    </div>
  );
}
