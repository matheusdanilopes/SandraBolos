import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ClientesList } from "./ClientesList";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .order("nome");

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
        <Link href="/clientes/novo" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          Novo
        </Link>
      </div>
      <ClientesList clientes={clientes ?? []} />
    </div>
  );
}
