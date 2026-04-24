import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { type PedidoComCliente } from "@/types/database";
import { Plus } from "lucide-react";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, clientes(nome)")
    .neq("status", "entregue")
    .order("data_entrega", { ascending: true });

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <Link href="/pedidos/novo" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          Novo Pedido
        </Link>
      </div>

      <DashboardClient pedidos={(pedidos ?? []) as unknown as PedidoComCliente[]} />
    </div>
  );
}
