import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SaboresList } from "./SaboresList";
import { type Sabor } from "@/types/database";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaboresPage() {
  const { data: sabores } = await supabase
    .from("sabores")
    .select("*")
    .order("nome");

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Sabores</h1>
        <Link href="/sabores/novo" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          Novo
        </Link>
      </div>

      <SaboresList sabores={(sabores ?? []) as Sabor[]} />
    </div>
  );
}
