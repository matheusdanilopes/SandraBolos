// Leitura em cache dos dados que quase nunca mudam.
//
// Catálogo de produtos, lista de clientes, categorias e configuração do
// cardápio entram em quase toda tela, mas mudam de mês em mês — e mesmo assim
// custavam uma ida ao Supabase a cada abertura, na frente do que a Sandra quer
// ver. Aqui eles passam pelo Data Cache do Next:
//
//  - as actions que gravam chamam `revalidateTag`, então edição feita no app
//    aparece na hora;
//  - `revalidate` é só a rede de segurança para alteração feita por fora (no
//    painel do Supabase, por exemplo), que o app não tem como perceber.

import { unstable_cache, revalidateTag } from "next/cache";
import { supabase } from "@/lib/supabase";
import { COLUNAS_CLIENTE, COLUNAS_PRODUTO } from "@/lib/consultas";

/** Rede de segurança para escrita feita fora do app. */
const VALIDADE_SEGUNDOS = 300;

export const TAG_PRODUTOS = "produtos";
export const TAG_CLIENTES = "clientes";
export const TAG_CATEGORIAS_PRODUTO = "categorias-produto";
export const TAG_CATEGORIAS_CUSTO = "categorias-custo";
export const TAG_CARDAPIO = "cardapio-config";

const ID_CARDAPIO = "00000000-0000-0000-0000-000000000001";

/**
 * Resultado no mesmo formato do supabase-js (`{ data, error }`), que é o que as
 * páginas já sabem inspecionar com `houveErroDeConexao`.
 */
type Resultado<T> = { data: T | null; error: unknown };

/**
 * Envolve uma leitura cacheada devolvendo `{ data, error }`.
 *
 * A função interna lança em caso de erro de propósito: `unstable_cache` não
 * guarda o que lançou, e guardar uma falha de rede por cinco minutos deixaria
 * o aviso de "sem conexão" presa na tela muito depois de a internet voltar.
 */
function comCache<T>(
  ler: () => Promise<T>,
  chave: string[],
  tags: string[]
): () => Promise<Resultado<T>> {
  const cacheada = unstable_cache(ler, chave, { tags, revalidate: VALIDADE_SEGUNDOS });
  return async () => {
    try {
      return { data: await cacheada(), error: null };
    } catch (error) {
      return { data: null, error };
    }
  };
}

// ─── Leituras ────────────────────────────────────────────────────────────────

/** Produtos ativos, na ordem do nome — alimenta os seletores de item. */
export const lerProdutosAtivos = comCache(
  async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select(COLUNAS_PRODUTO)
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  ["produtos-ativos"],
  [TAG_PRODUTOS]
);

/** Catálogo completo (ativos primeiro), com a categoria de cada produto. */
export const lerProdutosComCategoria = comCache(
  async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select(`${COLUNAS_PRODUTO}, categorias_produto(nome, ordem)`)
      .order("ativo", { ascending: false })
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  ["produtos-com-categoria"],
  [TAG_PRODUTOS, TAG_CATEGORIAS_PRODUTO]
);

/** Só os ativos, com categoria — é o que o cardápio desenha. */
export const lerProdutosAtivosComCategoria = comCache(
  async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select(`${COLUNAS_PRODUTO}, categorias_produto(nome, ordem)`)
      .eq("ativo", true)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  ["produtos-ativos-com-categoria"],
  [TAG_PRODUTOS, TAG_CATEGORIAS_PRODUTO]
);

/** Clientes para os seletores do formulário de pedido. */
export const lerClientesParaSelecao = comCache(
  async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select(COLUNAS_CLIENTE)
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  ["clientes-selecao"],
  [TAG_CLIENTES]
);

export const lerCategoriasProduto = comCache(
  async () => {
    const { data, error } = await supabase
      .from("categorias_produto")
      .select("*")
      .order("ordem")
      .order("nome");
    if (error) throw error;
    return data ?? [];
  },
  ["categorias-produto"],
  [TAG_CATEGORIAS_PRODUTO]
);

export const lerCategoriasCusto = comCache(
  async () => {
    const { data, error } = await supabase.from("categorias_custo").select("*").order("nome");
    if (error) throw error;
    return data ?? [];
  },
  ["categorias-custo"],
  [TAG_CATEGORIAS_CUSTO]
);

export const lerConfigCardapio = comCache(
  async () => {
    // `maybeSingle` em vez de `single`: linha ausente não é falha de leitura, e
    // com `single` o erro entraria no lugar do "ainda não configurado".
    const { data, error } = await supabase
      .from("cardapio_config")
      .select("*")
      .eq("id", ID_CARDAPIO)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  ["cardapio-config"],
  [TAG_CARDAPIO]
);

// ─── Invalidação ─────────────────────────────────────────────────────────────

/** Chamada pelas actions que gravam, para a tela já abrir com o dado novo. */
export function invalidarDadosDeApoio(...tags: string[]) {
  for (const tag of tags) revalidateTag(tag);
}
