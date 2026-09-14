import { supabase } from "@/lib/supabase";
import { PedidoForm } from "../PedidoForm";
import type { CategoriaProduto, ProdutoComCategoria } from "@/types/database";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const [clientesResult, produtosResult, categoriasResult] = await Promise.all([
    supabase.from("clientes").select("id, nome, telefone").order("nome"),
    // A categoria vem junto para o seletor de item poder filtrar por ela.
    supabase
      .from("produtos")
      .select("*, categorias_produto(nome, ordem)")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("categorias_produto").select("*").eq("ativo", true).order("ordem").order("nome"),
  ]);

  const { data: clientes } = clientesResult;
  const { data: produtos } = produtosResult;
  const { data: categorias } = categoriasResult;
  // Com a lista de clientes vazia por falha de rede é fácil cadastrar um cliente
  // repetido sem perceber — daí o aviso antes do formulário.
  const semConexao = houveErroDeConexao(clientesResult, produtosResult, categoriasResult);

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Novo Pedido</h1>
      {semConexao && (
        <AvisoConexao detalhe="As listas de clientes e produtos podem estar incompletas." />
      )}

      <PedidoForm
        clientes={clientes ?? []}
        produtos={(produtos ?? []) as unknown as ProdutoComCategoria[]}
        categorias={(categorias ?? []) as CategoriaProduto[]}
      />
    </div>
  );
}
