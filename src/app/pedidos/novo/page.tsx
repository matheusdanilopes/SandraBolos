import { PedidoForm } from "../PedidoForm";
import type { CategoriaProduto, ProdutoComCategoria } from "@/types/database";
import {
  lerCategoriasProduto,
  lerClientesParaSelecao,
  lerProdutosAtivosComCategoria,
} from "@/lib/dadosDeApoio";
import { houveErroDeConexao } from "@/lib/erros";
import { AvisoConexao } from "@/components/AvisoConexao";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  // Clientes, catálogo e categorias vêm do cache: o formulário abre sem esperar
  // três idas ao Supabase que devolvem quase sempre a mesma coisa. A categoria
  // vem junto com o produto para o seletor de item poder filtrar por ela.
  const [clientesResult, produtosResult, categoriasResult] = await Promise.all([
    lerClientesParaSelecao(),
    lerProdutosAtivosComCategoria(),
    lerCategoriasProduto(),
  ]);

  const { data: clientes } = clientesResult;
  const { data: produtos } = produtosResult;
  // A leitura cacheada traz todas as categorias; os chips do seletor mostram só
  // as ativas. Filtrar aqui evita uma segunda entrada de cache para uma tabela
  // de poucas linhas.
  const categorias = (categoriasResult.data ?? []).filter((c) => c.ativo);
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
        categorias={categorias as CategoriaProduto[]}
      />
    </div>
  );
}
