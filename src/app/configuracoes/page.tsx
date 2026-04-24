import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { ConfigForm } from "./ConfigForm";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

const LIMITE_PADRAO_KG = 0.3;

export default async function ConfiguracoesPage() {
  const supabase = createServerSupabaseClient();
  const { data: config } = await supabase
    .from("configuracoes")
    .select("limite_peso_extra_kg")
    .eq("id", 1)
    .single();

  const limiteAtualKg = config?.limite_peso_extra_kg ?? LIMITE_PADRAO_KG;

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center gap-2">
        <Settings size={20} className="text-gray-700" />
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
          Precificação
        </h2>
        <ConfigForm limiteAtualKg={limiteAtualKg} />
      </section>
    </div>
  );
}
