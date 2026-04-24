import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SaborForm } from "../../SaborForm";
import { type Sabor } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditarSaborPage({ params }: { params: { id: string } }) {
  const { data: sabor } = await supabase
    .from("sabores")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!sabor) notFound();

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Editar Sabor</h1>
      <SaborForm sabor={sabor as Sabor} />
    </div>
  );
}
