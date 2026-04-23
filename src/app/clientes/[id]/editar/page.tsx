import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ClienteForm } from "../../ClienteForm";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", params.id).single();
  if (!cliente) notFound();

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Editar Cliente</h1>
      <ClienteForm cliente={cliente} />
    </div>
  );
}
