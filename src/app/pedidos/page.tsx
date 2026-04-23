import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PedidosList } from "./PedidosList";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, clientes(nome, telefone)")
    .order("data_entrega", { ascending: true });

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pedidos</h1>
        <Link href="/pedidos/novo" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          Novo
        </Link>
      </div>

      <PedidosList pedidos={pedidos ?? []} />
    </div>
  );
}
