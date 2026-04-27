import { supabase } from "@/lib/supabase";
import { CategoriasSection } from "./CategoriasSection";
import type { CategoriaCusto } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const { data: categorias } = await supabase
    .from("categorias_custo")
    .select("*")
    .order("nome");

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
      <CategoriasSection categorias={(categorias ?? []) as CategoriaCusto[]} />
    </div>
  );
}
