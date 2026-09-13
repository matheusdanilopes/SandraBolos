import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ClienteForm } from "../../ClienteForm";
import { isErroDeConexao } from "@/lib/erros";
import { PainelSemConexao } from "@/components/PainelSemConexao";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", params.id)
    .single();

  // Falha de rede não é cliente inexistente — ver o 404 aqui assusta à toa.
  if (isErroDeConexao(error)) return <PainelSemConexao titulo="Não foi possível carregar o cliente" />;
  if (!cliente) notFound();

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Editar Cliente</h1>
      <ClienteForm cliente={cliente} />
    </div>
  );
}
